param(
    [Parameter(Mandatory = $true)]
    [string]$InputPath,

    [string]$Server = '192.168.5.239,1433',

    [string]$Database = 'RepairableDB',

    [string]$Username = 'Repairable'
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($env:REPAIRABLE_DB_PASSWORD)) {
    throw 'Set REPAIRABLE_DB_PASSWORD before running this script.'
}

function Convert-ToDatabaseValue {
    param([AllowNull()][object]$Value)

    if ($null -eq $Value -or [string]::IsNullOrWhiteSpace([string]$Value)) {
        return [DBNull]::Value
    }
    return [string]$Value
}

function Add-NodeRows {
    param(
        [Parameter(Mandatory = $true)]
        [object]$Node,

        [Parameter(Mandatory = $true)]
        [AllowEmptyCollection()]
        [System.Collections.Generic.List[object]]$Rows
    )

    $Rows.Add([pscustomobject]@{
        DeviceID = [string]$Node.DeviceID
        DeviceName = [string]$Node.DeviceName
        MaterialNo = Convert-ToDatabaseValue $Node.MaterialNo
        SerialNumber = Convert-ToDatabaseValue $Node.SerialNumber
        CurrentLocationDeviceID = Convert-ToDatabaseValue $Node.CurrentLocationDeviceID
    })

    foreach ($child in @($Node.Children)) {
        Add-NodeRows -Node $child -Rows $Rows
    }
}

$hierarchy = Get-Content -LiteralPath $InputPath -Raw -Encoding UTF8 | ConvertFrom-Json
$rows = New-Object System.Collections.Generic.List[object]

foreach ($station in @($hierarchy.Stations)) {
    Add-NodeRows -Node $station -Rows $rows
}

if ($rows.Count -eq 0) {
    throw 'The hierarchy file contains no rows.'
}

$keys = @{}
foreach ($row in $rows) {
    $key = $row.DeviceID
    if ($keys.ContainsKey($key)) {
        throw "Duplicate hierarchy key: $key"
    }
    $keys[$key] = $true
}

foreach ($row in $rows | Where-Object { $_.CurrentLocationDeviceID -isnot [DBNull] }) {
    $parentKey = $row.CurrentLocationDeviceID
    if (-not $keys.ContainsKey($parentKey)) {
        throw "Missing parent hierarchy key: $parentKey"
    }
}

$connectionString = New-Object System.Data.SqlClient.SqlConnectionStringBuilder
$connectionString['Data Source'] = $Server
$connectionString['Initial Catalog'] = $Database
$connectionString['User ID'] = $Username
$connectionString['Password'] = $env:REPAIRABLE_DB_PASSWORD
$connectionString['Encrypt'] = $true
$connectionString['TrustServerCertificate'] = $true
$connectionString['Application Name'] = 'CodexRepairableDeviceImport'

$connection = New-Object System.Data.SqlClient.SqlConnection($connectionString.ConnectionString)
$connection.Open()
$transaction = $connection.BeginTransaction()

try {
    $schemaCommand = $connection.CreateCommand()
    $schemaCommand.Transaction = $transaction
    $schemaCommand.CommandText = @"
IF OBJECT_ID(N'dbo.RepairableDevices', N'U') IS NOT NULL
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.RepairableDevices)
        THROW 50001, 'dbo.RepairableDevices is not empty; import cancelled.', 1;

    DROP TABLE dbo.RepairableDevices;
END;

CREATE TABLE dbo.RepairableDevices
(
    DeviceID VARCHAR(64) NOT NULL,
    DeviceName NVARCHAR(100) NOT NULL,
    MaterialNo VARCHAR(50) NULL,
    SerialNumber VARCHAR(50) NULL,
    PurchaseDate DATE NULL,
    CurrentLocationDeviceID VARCHAR(64) NULL,
    CreatedAt DATETIME2(0) NOT NULL
        CONSTRAINT DF_RepairableDevices_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2(0) NOT NULL
        CONSTRAINT DF_RepairableDevices_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_RepairableDevices
        PRIMARY KEY CLUSTERED (DeviceID),
    CONSTRAINT FK_RepairableDevices_CurrentLocation
        FOREIGN KEY (CurrentLocationDeviceID)
        REFERENCES dbo.RepairableDevices (DeviceID),
    CONSTRAINT CK_RepairableDevices_CurrentLocation_NotSelf
        CHECK (CurrentLocationDeviceID IS NULL OR CurrentLocationDeviceID <> DeviceID)
);

CREATE NONCLUSTERED INDEX IX_RepairableDevices_CurrentLocation
    ON dbo.RepairableDevices (CurrentLocationDeviceID);
"@
    [void]$schemaCommand.ExecuteNonQuery()

    $insertCommand = $connection.CreateCommand()
    $insertCommand.Transaction = $transaction
    $insertCommand.CommandText = @"
INSERT INTO dbo.RepairableDevices
    (DeviceID, DeviceName, MaterialNo, SerialNumber, CurrentLocationDeviceID)
VALUES
    (@DeviceID, @DeviceName, @MaterialNo, @SerialNumber, @CurrentLocationDeviceID);
"@

    [void]$insertCommand.Parameters.Add('@DeviceID', [System.Data.SqlDbType]::VarChar, 64)
    [void]$insertCommand.Parameters.Add('@DeviceName', [System.Data.SqlDbType]::NVarChar, 100)
    [void]$insertCommand.Parameters.Add('@MaterialNo', [System.Data.SqlDbType]::VarChar, 50)
    [void]$insertCommand.Parameters.Add('@SerialNumber', [System.Data.SqlDbType]::VarChar, 50)
    [void]$insertCommand.Parameters.Add('@CurrentLocationDeviceID', [System.Data.SqlDbType]::VarChar, 64)

    foreach ($row in $rows) {
        $insertCommand.Parameters['@DeviceID'].Value = $row.DeviceID
        $insertCommand.Parameters['@DeviceName'].Value = $row.DeviceName
        $insertCommand.Parameters['@MaterialNo'].Value = $row.MaterialNo
        $insertCommand.Parameters['@SerialNumber'].Value = $row.SerialNumber
        $insertCommand.Parameters['@CurrentLocationDeviceID'].Value = $row.CurrentLocationDeviceID
        [void]$insertCommand.ExecuteNonQuery()
    }

    $verificationCommand = $connection.CreateCommand()
    $verificationCommand.Transaction = $transaction
    $verificationCommand.CommandText = @"
;WITH Tree AS
(
    SELECT DeviceID, CurrentLocationDeviceID, 1 AS Depth
    FROM dbo.RepairableDevices
    WHERE CurrentLocationDeviceID IS NULL

    UNION ALL

    SELECT child.DeviceID, child.CurrentLocationDeviceID, parent.Depth + 1
    FROM dbo.RepairableDevices AS child
    INNER JOIN Tree AS parent
        ON parent.DeviceID = child.CurrentLocationDeviceID
)
SELECT
    (SELECT COUNT(*) FROM dbo.RepairableDevices) AS TotalRows,
    (SELECT COUNT(*) FROM dbo.RepairableDevices WHERE CurrentLocationDeviceID IS NULL) AS StationRows,
    (SELECT COUNT(*) FROM dbo.RepairableDevices
      WHERE MaterialNo IS NULL AND CurrentLocationDeviceID IS NOT NULL) AS DeviceRows,
    (SELECT COUNT(*) FROM dbo.RepairableDevices
      WHERE MaterialNo IS NOT NULL) AS PartRows,
    (SELECT MAX(Depth) FROM Tree) AS MaximumDepth,
    (SELECT COUNT(*) FROM dbo.RepairableDevices AS child
      LEFT JOIN dbo.RepairableDevices AS parent
        ON parent.DeviceID = child.CurrentLocationDeviceID
      WHERE child.CurrentLocationDeviceID IS NOT NULL
        AND parent.DeviceID IS NULL) AS OrphanRows
OPTION (MAXRECURSION 100);
"@

    $reader = $verificationCommand.ExecuteReader()
    $verification = New-Object System.Data.DataTable
    $verification.Load($reader)

    if ([int]$verification.Rows[0].TotalRows -ne $rows.Count -or
        [int]$verification.Rows[0].OrphanRows -ne 0) {
        throw 'Post-import verification failed.'
    }

    $transaction.Commit()

    [pscustomobject]@{
        TotalRows = [int]$verification.Rows[0].TotalRows
        StationRows = [int]$verification.Rows[0].StationRows
        DeviceRows = [int]$verification.Rows[0].DeviceRows
        PartRows = [int]$verification.Rows[0].PartRows
        MaximumDepth = [int]$verification.Rows[0].MaximumDepth
        OrphanRows = [int]$verification.Rows[0].OrphanRows
    } | ConvertTo-Json -Compress
}
catch {
    try { $transaction.Rollback() } catch { }
    throw
}
finally {
    $connection.Close()
}

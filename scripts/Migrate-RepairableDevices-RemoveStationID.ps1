param(
    [string]$Server = '192.168.5.239,1433',
    [string]$Database = 'RepairableDB',
    [string]$Username = 'Repairable'
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($env:REPAIRABLE_DB_PASSWORD)) {
    throw 'Set REPAIRABLE_DB_PASSWORD before running this script.'
}

$builder = New-Object System.Data.SqlClient.SqlConnectionStringBuilder
$builder['Data Source'] = $Server
$builder['Initial Catalog'] = $Database
$builder['User ID'] = $Username
$builder['Password'] = $env:REPAIRABLE_DB_PASSWORD
$builder['Encrypt'] = $true
$builder['TrustServerCertificate'] = $true
$builder['Application Name'] = 'CodexRemoveRepairableDeviceStationID'

$connection = New-Object System.Data.SqlClient.SqlConnection($builder.ConnectionString)
$connection.Open()
$transaction = $connection.BeginTransaction()

try {
    $command = $connection.CreateCommand()
    $command.Transaction = $transaction
    $command.CommandTimeout = 60
    $command.CommandText = @"
IF COL_LENGTH(N'dbo.RepairableDevices', N'StationID') IS NULL
    THROW 50001, 'StationID does not exist; migration cancelled.', 1;

IF OBJECT_ID(N'tempdb..#DeviceIDMap') IS NOT NULL
    DROP TABLE #DeviceIDMap;

SELECT
    StationID,
    DeviceID AS OldDeviceID,
    CASE
        WHEN CurrentLocationDeviceID IS NOT NULL AND MaterialNo IS NULL
            THEN CONCAT(StationID, DeviceID)
        ELSE DeviceID
    END AS NewDeviceID
INTO #DeviceIDMap
FROM dbo.RepairableDevices;

IF EXISTS
(
    SELECT NewDeviceID
    FROM #DeviceIDMap
    GROUP BY NewDeviceID
    HAVING COUNT(*) > 1
)
    THROW 50002, 'The transformed DeviceID values are not globally unique.', 1;

IF EXISTS
(
    SELECT 1
    FROM dbo.RepairableDevices AS child
    LEFT JOIN #DeviceIDMap AS parent
      ON parent.StationID = child.StationID
     AND parent.OldDeviceID = child.CurrentLocationDeviceID
    WHERE child.CurrentLocationDeviceID IS NOT NULL
      AND parent.NewDeviceID IS NULL
)
    THROW 50003, 'At least one current-location parent cannot be mapped.', 1;

IF OBJECT_ID(N'dbo.RepairableDevices_New', N'U') IS NOT NULL
    THROW 50004, 'dbo.RepairableDevices_New already exists; migration cancelled.', 1;

CREATE TABLE dbo.RepairableDevices_New
(
    DeviceID VARCHAR(64) NOT NULL,
    DeviceName NVARCHAR(100) NOT NULL,
    MaterialNo VARCHAR(50) NULL,
    SerialNumber VARCHAR(50) NULL,
    CurrentLocationDeviceID VARCHAR(64) NULL,
    CreatedAt DATETIME2(0) NOT NULL,
    UpdatedAt DATETIME2(0) NOT NULL
);

INSERT INTO dbo.RepairableDevices_New
    (DeviceID, DeviceName, MaterialNo, SerialNumber,
     CurrentLocationDeviceID, CreatedAt, UpdatedAt)
SELECT
    selfMap.NewDeviceID,
    source.DeviceName,
    source.MaterialNo,
    source.SerialNumber,
    parentMap.NewDeviceID,
    source.CreatedAt,
    source.UpdatedAt
FROM dbo.RepairableDevices AS source
INNER JOIN #DeviceIDMap AS selfMap
  ON selfMap.StationID = source.StationID
 AND selfMap.OldDeviceID = source.DeviceID
LEFT JOIN #DeviceIDMap AS parentMap
  ON parentMap.StationID = source.StationID
 AND parentMap.OldDeviceID = source.CurrentLocationDeviceID;

IF (SELECT COUNT(*) FROM dbo.RepairableDevices_New)
   <> (SELECT COUNT(*) FROM dbo.RepairableDevices)
    THROW 50005, 'Row-count validation failed before table swap.', 1;

DROP TABLE dbo.RepairableDevices;
EXEC sys.sp_rename N'dbo.RepairableDevices_New', N'RepairableDevices';

ALTER TABLE dbo.RepairableDevices
    ADD CONSTRAINT PK_RepairableDevices
        PRIMARY KEY CLUSTERED (DeviceID);

ALTER TABLE dbo.RepairableDevices
    ADD CONSTRAINT FK_RepairableDevices_CurrentLocation
        FOREIGN KEY (CurrentLocationDeviceID)
        REFERENCES dbo.RepairableDevices (DeviceID);

ALTER TABLE dbo.RepairableDevices
    ADD CONSTRAINT CK_RepairableDevices_CurrentLocation_NotSelf
        CHECK (CurrentLocationDeviceID IS NULL OR CurrentLocationDeviceID <> DeviceID);

ALTER TABLE dbo.RepairableDevices
    ADD CONSTRAINT DF_RepairableDevices_CreatedAt
        DEFAULT SYSUTCDATETIME() FOR CreatedAt;

ALTER TABLE dbo.RepairableDevices
    ADD CONSTRAINT DF_RepairableDevices_UpdatedAt
        DEFAULT SYSUTCDATETIME() FOR UpdatedAt;

CREATE NONCLUSTERED INDEX IX_RepairableDevices_CurrentLocation
    ON dbo.RepairableDevices (CurrentLocationDeviceID);

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
      WHERE MaterialNo IS NULL AND CurrentLocationDeviceID IS NOT NULL) AS RenamedDeviceRows,
    (SELECT COUNT(*) FROM dbo.RepairableDevices WHERE MaterialNo IS NOT NULL) AS UnchangedPartRows,
    (SELECT MAX(Depth) FROM Tree) AS MaximumDepth,
    (SELECT COUNT(*)
       FROM dbo.RepairableDevices AS child
       LEFT JOIN dbo.RepairableDevices AS parent
         ON parent.DeviceID = child.CurrentLocationDeviceID
      WHERE child.CurrentLocationDeviceID IS NOT NULL
        AND parent.DeviceID IS NULL) AS OrphanRows,
    CASE WHEN COL_LENGTH(N'dbo.RepairableDevices', N'StationID') IS NULL
         THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS StationIDRemoved
OPTION (MAXRECURSION 100);
"@

    $reader = $command.ExecuteReader()
    $result = New-Object System.Data.DataTable
    $result.Load($reader)

    if ([int]$result.Rows[0].TotalRows -ne 101 -or
        [int]$result.Rows[0].OrphanRows -ne 0 -or
        -not [bool]$result.Rows[0].StationIDRemoved) {
        throw 'Post-migration verification failed.'
    }

    $transaction.Commit()

    [pscustomobject]@{
        TotalRows = [int]$result.Rows[0].TotalRows
        StationRows = [int]$result.Rows[0].StationRows
        RenamedDeviceRows = [int]$result.Rows[0].RenamedDeviceRows
        UnchangedPartRows = [int]$result.Rows[0].UnchangedPartRows
        MaximumDepth = [int]$result.Rows[0].MaximumDepth
        OrphanRows = [int]$result.Rows[0].OrphanRows
        StationIDRemoved = [bool]$result.Rows[0].StationIDRemoved
    } | ConvertTo-Json -Compress
}
catch {
    try { $transaction.Rollback() } catch { }
    throw
}
finally {
    $connection.Close()
}

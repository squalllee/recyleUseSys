param(
    [Parameter(Mandatory = $true)]
    [string]$InputPath,

    [Parameter(Mandatory = $true)]
    [string]$OutputPath
)

$ErrorActionPreference = 'Stop'

function Get-SpreadsheetRows {
    param([string]$Path)

    $stream = [System.IO.File]::Open(
        $Path,
        [System.IO.FileMode]::Open,
        [System.IO.FileAccess]::Read,
        [System.IO.FileShare]::ReadWrite
    )

    try {
        $document = New-Object System.Xml.XmlDocument
        $document.Load($stream)
    }
    finally {
        $stream.Dispose()
    }

    $namespaceManager = New-Object System.Xml.XmlNamespaceManager($document.NameTable)
    $namespaceManager.AddNamespace('ss', 'urn:schemas-microsoft-com:office:spreadsheet')
    $xmlRows = $document.SelectNodes('//ss:Worksheet/ss:Table/ss:Row', $namespaceManager)

    if ($xmlRows.Count -lt 2) {
        throw 'The source workbook does not contain any data rows.'
    }

    $headers = @(
        $xmlRows[0].SelectNodes('./ss:Cell/ss:Data', $namespaceManager) |
            ForEach-Object { $_.InnerText }
    )

    $result = New-Object System.Collections.Generic.List[object]
    for ($rowIndex = 1; $rowIndex -lt $xmlRows.Count; $rowIndex++) {
        $values = New-Object string[] $headers.Count
        $columnIndex = 0

        foreach ($cell in $xmlRows[$rowIndex].SelectNodes('./ss:Cell', $namespaceManager)) {
            $explicitIndex = $cell.GetAttribute(
                'Index',
                'urn:schemas-microsoft-com:office:spreadsheet'
            )
            if ($explicitIndex) {
                $columnIndex = [int]$explicitIndex - 1
            }

            $dataNode = $cell.SelectSingleNode('./ss:Data', $namespaceManager)
            $values[$columnIndex] = if ($dataNode) { $dataNode.InnerText.Trim() } else { '' }
            $columnIndex++
        }

        $record = [ordered]@{ SourceRow = $rowIndex + 1 }
        for ($i = 0; $i -lt $headers.Count; $i++) {
            $record[$headers[$i]] = $values[$i]
        }
        $result.Add([pscustomobject]$record)
    }

    return $result
}

function New-HierarchyNode {
    param(
        [string]$DeviceID,
        [string]$DeviceName,
        [AllowNull()][string]$MaterialNo,
        [AllowNull()][string]$SerialNumber,
        [AllowNull()][string]$CurrentLocationDeviceID,
        [string]$Level,
        [AllowNull()][string]$Status,
        [int]$SourceRow
    )

    return [ordered]@{
        DeviceID               = $DeviceID
        DeviceName             = $DeviceName
        MaterialNo             = $MaterialNo
        SerialNumber           = $SerialNumber
        CurrentLocationDeviceID = $CurrentLocationDeviceID
        Level                  = $Level
        Status                 = $Status
        SourceRow              = $SourceRow
        Children               = New-Object System.Collections.Generic.List[object]
    }
}

function Get-StationParts {
    param([string]$Station)

    $match = [regex]::Match($Station, '^\s*(\S+)\s+(.+?)\s*$')
    if (-not $match.Success) {
        throw "Station '$Station' does not match '<DeviceID> <DeviceName>'."
    }

    return [pscustomobject]@{
        DeviceID   = $match.Groups[1].Value
        DeviceName = $match.Groups[2].Value
    }
}

function Get-PartPathKey {
    param(
        [string]$StationID,
        [string]$DeviceID,
        [string]$L1Name,
        [string]$L2Name = ''
    )

    return "$StationID`u{001F}$DeviceID`u{001F}$L1Name`u{001F}$L2Name"
}

$rows = @(Get-SpreadsheetRows -Path $InputPath)
$stationNodes = [ordered]@{}
$deviceNodes = @{}
$l1Nodes = @{}
$l2Nodes = @{}
$partCounters = @{}
$partRowIDs = @{}

# Allocate stable part IDs in original source order. Each part number has its own sequence.
foreach ($row in $rows | Where-Object { $_.Level -in @('L1', 'L2', 'L3') }) {
    if ([string]::IsNullOrWhiteSpace($row.PartNumber)) {
        throw "Source row $($row.SourceRow) has no PartNumber."
    }

    $partCounters[$row.PartNumber] = 1 + [int]$partCounters[$row.PartNumber]
    $partRowIDs[$row.SourceRow] = '{0}_{1:D4}' -f $row.PartNumber, $partCounters[$row.PartNumber]
}

# Create station and equipment nodes first.
foreach ($row in $rows | Where-Object { $_.Level -eq 'Device' }) {
    $station = Get-StationParts -Station $row.Station
    if (-not $stationNodes.Contains($station.DeviceID)) {
        $stationNodes[$station.DeviceID] = New-HierarchyNode `
            -DeviceID $station.DeviceID `
            -DeviceName $station.DeviceName `
            -MaterialNo $null `
            -SerialNumber $null `
            -CurrentLocationDeviceID $null `
            -Level 'Station' `
            -Status $null `
            -SourceRow 0
    }

    $deviceKey = "$($station.DeviceID)`u{001F}$($row.DeviceID)"
    if ($deviceNodes.ContainsKey($deviceKey)) {
        throw "Duplicate device '$($row.DeviceID)' under station '$($station.DeviceID)'."
    }

    $prefixedDeviceID = "$($station.DeviceID)$($row.DeviceID)"
    $deviceNode = New-HierarchyNode `
        -DeviceID $prefixedDeviceID `
        -DeviceName $row.Device_Name `
        -MaterialNo $null `
        -SerialNumber $row.Device_Serial `
        -CurrentLocationDeviceID $station.DeviceID `
        -Level 'Device' `
        -Status $row.Status `
        -SourceRow $row.SourceRow

    $deviceNodes[$deviceKey] = $deviceNode
    $stationNodes[$station.DeviceID].Children.Add($deviceNode)
}

# Attach L1, then L2, then L3 so every child can resolve its parent.
foreach ($level in @('L1', 'L2', 'L3')) {
    foreach ($row in $rows | Where-Object { $_.Level -eq $level }) {
        $station = Get-StationParts -Station $row.Station
        $deviceKey = "$($station.DeviceID)`u{001F}$($row.DeviceID)"
        if (-not $deviceNodes.ContainsKey($deviceKey)) {
            throw "Source row $($row.SourceRow) references missing device '$deviceKey'."
        }

        $nodeName = switch ($level) {
            'L1' { $row.L1_Name }
            'L2' { $row.L2_Name }
            'L3' { $row.L3_Name }
        }

        if ([string]::IsNullOrWhiteSpace($nodeName)) {
            throw "Source row $($row.SourceRow) has no name for level $level."
        }

        $parent = $null
        if ($level -eq 'L1') {
            $parent = $deviceNodes[$deviceKey]
        }
        elseif ($level -eq 'L2') {
            $l1Key = Get-PartPathKey $station.DeviceID $row.DeviceID $row.L1_Name
            $parent = $l1Nodes[$l1Key]
        }
        else {
            $l2Key = Get-PartPathKey $station.DeviceID $row.DeviceID $row.L1_Name $row.L2_Name
            $parent = $l2Nodes[$l2Key]
        }

        if ($null -eq $parent) {
            throw "Source row $($row.SourceRow) cannot resolve its $level parent."
        }

        $node = New-HierarchyNode `
            -DeviceID $partRowIDs[$row.SourceRow] `
            -DeviceName $nodeName `
            -MaterialNo $row.PartNumber `
            -SerialNumber $row.Serial `
            -CurrentLocationDeviceID $parent.DeviceID `
            -Level $level `
            -Status $row.Status `
            -SourceRow $row.SourceRow

        $parent.Children.Add($node)

        if ($level -eq 'L1') {
            $pathKey = Get-PartPathKey $station.DeviceID $row.DeviceID $row.L1_Name
            if ($l1Nodes.ContainsKey($pathKey)) {
                throw "Duplicate L1 path at source row $($row.SourceRow)."
            }
            $l1Nodes[$pathKey] = $node
        }
        elseif ($level -eq 'L2') {
            $pathKey = Get-PartPathKey $station.DeviceID $row.DeviceID $row.L1_Name $row.L2_Name
            if ($l2Nodes.ContainsKey($pathKey)) {
                throw "Duplicate L2 path at source row $($row.SourceRow)."
            }
            $l2Nodes[$pathKey] = $node
        }
    }
}

$duplicateDeviceIDs = @(
    $rows |
        Where-Object { $_.Level -eq 'Device' } |
        Group-Object DeviceID |
        Where-Object Count -gt 1 |
        ForEach-Object {
            [ordered]@{
                DeviceID = $_.Name
                Stations = @($_.Group | ForEach-Object { (Get-StationParts $_.Station).DeviceID })
            }
        }
)

$output = [ordered]@{
    FormatVersion = 1
    SourceFile = [System.IO.Path]::GetFileName($InputPath)
    Rules = [ordered]@{
        Station = 'Station is split into DeviceID and DeviceName; it is the root node.'
        Device = 'DeviceID is Station DeviceID plus source DeviceID; CurrentLocationDeviceID is the station DeviceID.'
        Part = 'DeviceID is PartNumber plus an underscore and a per-PartNumber four-digit sequence.'
        Hierarchy = 'L1 is under Device, L2 is under L1, and L3 is under L2.'
    }
    Counts = [ordered]@{
        Stations = $stationNodes.Count
        Devices = $deviceNodes.Count
        Parts = $partRowIDs.Count
        TotalNodes = $stationNodes.Count + $deviceNodes.Count + $partRowIDs.Count
    }
    Validation = [ordered]@{
        DuplicateDeviceIDsAcrossStations = $duplicateDeviceIDs
    }
    Stations = @($stationNodes.Values)
}

$outputDirectory = [System.IO.Path]::GetDirectoryName([System.IO.Path]::GetFullPath($OutputPath))
if (-not [System.IO.Directory]::Exists($outputDirectory)) {
    [System.IO.Directory]::CreateDirectory($outputDirectory) | Out-Null
}

$json = $output | ConvertTo-Json -Depth 20
[System.IO.File]::WriteAllText(
    [System.IO.Path]::GetFullPath($OutputPath),
    $json,
    (New-Object System.Text.UTF8Encoding($false))
)

[pscustomobject]@{
    OutputPath = [System.IO.Path]::GetFullPath($OutputPath)
    StationCount = $stationNodes.Count
    DeviceCount = $deviceNodes.Count
    PartCount = $partRowIDs.Count
    TotalNodeCount = $stationNodes.Count + $deviceNodes.Count + $partRowIDs.Count
    DuplicateDeviceIDCount = $duplicateDeviceIDs.Count
} | ConvertTo-Json -Compress

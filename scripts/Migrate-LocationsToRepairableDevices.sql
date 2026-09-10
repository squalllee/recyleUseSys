SET NOCOUNT ON;
SET XACT_ABORT ON;

/*
    Copy the legacy Locations rows into RepairableDevices as root nodes.

    Mapping:
      Locations.LocationCode -> RepairableDevices.DeviceID
      Locations.LocationName -> RepairableDevices.DeviceName
      MaterialNo/SerialNumber/System/SubSystem -> NULL
      CurrentLocationDeviceID -> NULL (root)
      Type -> location

    The source Locations table is intentionally retained because existing
    maintenance records still store LocationCode values. This script is
    idempotent: existing location roots are refreshed and missing roots are
    inserted on subsequent runs.
*/

BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID(N'dbo.Locations', N'U') IS NULL
        THROW 50040, 'dbo.Locations does not exist.', 1;

    IF OBJECT_ID(N'dbo.RepairableDevices', N'U') IS NULL
        THROW 50041, 'dbo.RepairableDevices does not exist.', 1;

    IF OBJECT_ID(N'dbo.RepairableCategories', N'U') IS NULL
        THROW 50042, 'dbo.RepairableCategories does not exist.', 1;

    IF COL_LENGTH(N'dbo.RepairableDevices', N'Type') IS NULL
       OR COL_LENGTH(N'dbo.RepairableDevices', N'System') IS NULL
       OR COL_LENGTH(N'dbo.RepairableDevices', N'SubSystem') IS NULL
        THROW 50043, 'RepairableDevices classification columns do not exist.', 1;

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.RepairableCategories
        WHERE CategoryCode = 'location'
    )
        THROW 50044, 'The location repairable category does not exist.', 1;

    IF EXISTS
    (
        SELECT 1
        FROM dbo.Locations
        WHERE NULLIF(LTRIM(RTRIM(LocationCode)), '') IS NULL
           OR LEN(LocationCode) > 64
           OR LocationCode <> LTRIM(RTRIM(LocationCode))
    )
        THROW 50045, 'Locations contains a blank, oversized, or padded LocationCode.', 1;

    IF EXISTS
    (
        SELECT 1
        FROM dbo.Locations
        WHERE NULLIF(LTRIM(RTRIM(LocationName)), '') IS NULL
    )
        THROW 50046, 'Locations contains a blank LocationName.', 1;

    IF EXISTS
    (
        SELECT LocationCode
        FROM dbo.Locations
        GROUP BY LocationCode
        HAVING COUNT(*) > 1
    )
        THROW 50047, 'Locations contains duplicate LocationCode values.', 1;

    /* A source code may only reuse an existing root location node. */
    IF EXISTS
    (
        SELECT 1
        FROM dbo.Locations AS source
        INNER JOIN dbo.RepairableDevices AS target
            ON target.DeviceID = source.LocationCode
        WHERE target.[Type] <> 'location'
           OR target.CurrentLocationDeviceID IS NOT NULL
    )
        THROW 50048, 'A LocationCode already belongs to a non-root repairable node.', 1;

    /* Refresh an already migrated root while preserving its children. */
    UPDATE target
    SET target.DeviceName = source.LocationName,
        target.MaterialNo = NULL,
        target.SerialNumber = NULL,
        target.CurrentLocationDeviceID = NULL,
        target.[Type] = 'location',
        target.[System] = NULL,
        target.[SubSystem] = NULL,
        target.UpdatedAt = SYSUTCDATETIME()
    FROM dbo.RepairableDevices AS target
    INNER JOIN dbo.Locations AS source
        ON source.LocationCode = target.DeviceID
    WHERE target.[Type] = 'location'
      AND target.CurrentLocationDeviceID IS NULL;

    DECLARE @UpdatedRows INT = @@ROWCOUNT;

    /* UPDLOCK/HOLDLOCK prevents a concurrent run from inserting the same root. */
    INSERT INTO dbo.RepairableDevices
    (
        DeviceID,
        DeviceName,
        MaterialNo,
        SerialNumber,
        CurrentLocationDeviceID,
        [Type],
        [System],
        [SubSystem]
    )
    SELECT
        source.LocationCode,
        source.LocationName,
        NULL,
        NULL,
        NULL,
        'location',
        NULL,
        NULL
    FROM dbo.Locations AS source
    WHERE NOT EXISTS
    (
        SELECT 1
        FROM dbo.RepairableDevices AS target WITH (UPDLOCK, HOLDLOCK)
        WHERE target.DeviceID = source.LocationCode
    );

    DECLARE @InsertedRows INT = @@ROWCOUNT;

    DECLARE @MissingRows INT;
    SELECT @MissingRows = COUNT(*)
    FROM dbo.Locations AS source
    LEFT JOIN dbo.RepairableDevices AS target
        ON target.DeviceID = source.LocationCode
    WHERE target.DeviceID IS NULL;

    IF @MissingRows <> 0
        THROW 50049, 'Location root verification failed: one or more rows are missing.', 1;

    DECLARE @InvalidRootRows INT;
    SELECT @InvalidRootRows = COUNT(*)
    FROM dbo.Locations AS source
    INNER JOIN dbo.RepairableDevices AS target
        ON target.DeviceID = source.LocationCode
    WHERE target.[Type] <> 'location'
       OR target.CurrentLocationDeviceID IS NOT NULL
       OR target.MaterialNo IS NOT NULL
       OR target.SerialNumber IS NOT NULL
       OR target.[System] IS NOT NULL
       OR target.[SubSystem] IS NOT NULL
       OR target.DeviceName <> source.LocationName;

    IF @InvalidRootRows <> 0
        THROW 50050, 'Location root verification failed: one or more rows are not valid roots.', 1;

    COMMIT TRANSACTION;

    SELECT
        (SELECT COUNT(*) FROM dbo.Locations) AS SourceLocationRows,
        @InsertedRows AS InsertedRootRows,
        @UpdatedRows AS UpdatedRootRows,
        (SELECT COUNT(*)
         FROM dbo.RepairableDevices
         WHERE [Type] = 'location'
           AND CurrentLocationDeviceID IS NULL) AS TotalLocationRootRows,
        @MissingRows AS MissingRootRows,
        @InvalidRootRows AS InvalidRootRows;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;

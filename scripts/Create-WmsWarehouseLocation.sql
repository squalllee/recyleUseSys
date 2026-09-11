SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID(N'dbo.RepairableDevices', N'U') IS NULL
        THROW 50060, 'dbo.RepairableDevices does not exist.', 1;

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.RepairableCategories
        WHERE CategoryCode = 'location'
    )
        THROW 50061, 'The location repairable category does not exist.', 1;

    IF EXISTS
    (
        SELECT 1
        FROM dbo.RepairableDevices
        WHERE DeviceID = 'WMS'
          AND
          (
              CurrentLocationDeviceID IS NOT NULL
          )
    )
        THROW 50062, 'DeviceID WMS already belongs to a non-root repairable node.', 1;

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.RepairableDevices
        WHERE DeviceID = 'WMS'
    )
    BEGIN
        INSERT INTO dbo.RepairableDevices
        (
            DeviceID,
            DeviceName,
            MaterialNo,
            SerialNumber,
            CurrentLocationDeviceID,
            [System],
            [SubSystem]
        )
        VALUES
        (
            'WMS',
            N'倉庫-WMS',
            NULL,
            NULL,
            NULL,
            NULL,
            NULL
        );
    END
    ELSE
    BEGIN
        UPDATE dbo.RepairableDevices
        SET DeviceName = N'倉庫-WMS',
            MaterialNo = NULL,
            SerialNumber = NULL,
            [System] = NULL,
            [SubSystem] = NULL,
            UpdatedAt = SYSUTCDATETIME()
        WHERE DeviceID = 'WMS'
          AND CurrentLocationDeviceID IS NULL;
    END;

    COMMIT TRANSACTION;

    SELECT DeviceID, DeviceName, MaterialNo, SerialNumber,
           CurrentLocationDeviceID, [System], [SubSystem]
    FROM dbo.RepairableDevices
    WHERE DeviceID = 'WMS';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;

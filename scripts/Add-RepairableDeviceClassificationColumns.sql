SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID(N'dbo.RepairableDevices', N'U') IS NULL
        THROW 50020, 'dbo.RepairableDevices does not exist.', 1;

    IF COL_LENGTH(N'dbo.RepairableDevices', N'System') IS NULL
    BEGIN
        ALTER TABLE dbo.RepairableDevices
            ADD [System] NVARCHAR(100) NULL;
    END;

    IF COL_LENGTH(N'dbo.RepairableDevices', N'SubSystem') IS NULL
    BEGIN
        ALTER TABLE dbo.RepairableDevices
            ADD [SubSystem] NVARCHAR(100) NULL;
    END;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;

SELECT
    DeviceID,
    [System],
    [SubSystem]
FROM dbo.RepairableDevices
ORDER BY DeviceID;

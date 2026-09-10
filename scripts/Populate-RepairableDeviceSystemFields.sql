SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID(N'dbo.RepairableDevices', N'U') IS NULL
        THROW 50030, 'dbo.RepairableDevices does not exist.', 1;

    IF COL_LENGTH(N'dbo.RepairableDevices', N'System') IS NULL
       OR COL_LENGTH(N'dbo.RepairableDevices', N'SubSystem') IS NULL
    BEGIN
        THROW 50031, 'System or SubSystem column does not exist.', 1;
    END;

    IF EXISTS
    (
        SELECT 1
        FROM dbo.RepairableDevices
        WHERE MaterialNo IS NOT NULL
          AND LEN(MaterialNo) < 5
    )
    BEGIN
        THROW 50032, 'One or more material numbers are shorter than five characters.', 1;
    END;

    UPDATE dbo.RepairableDevices
    SET [System] = LEFT(MaterialNo, 1),
        [SubSystem] = SUBSTRING(MaterialNo, 4, 2),
        UpdatedAt = SYSUTCDATETIME()
    WHERE MaterialNo IS NOT NULL
      AND
      (
          [System] IS NULL
          OR [System] <> LEFT(MaterialNo, 1)
          OR [SubSystem] IS NULL
          OR [SubSystem] <> SUBSTRING(MaterialNo, 4, 2)
      );

    DECLARE @UpdatedRows INT = @@ROWCOUNT;

    COMMIT TRANSACTION;

    SELECT
        @UpdatedRows AS UpdatedRows,
        COUNT_BIG(*) AS TotalPopulatedRows
    FROM dbo.RepairableDevices
    WHERE MaterialNo IS NOT NULL
      AND [System] = LEFT(MaterialNo, 1)
      AND [SubSystem] = SUBSTRING(MaterialNo, 4, 2);
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;

SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID(N'dbo.RepairableDevices', N'U') IS NULL
        THROW 50130, 'dbo.RepairableDevices does not exist.', 1;

    IF COL_LENGTH(N'dbo.RepairableDevices', N'Type') IS NOT NULL
    BEGIN
        /* The classification FK/index were created by the earlier schema. */
        IF EXISTS
        (
            SELECT 1
            FROM sys.foreign_keys
            WHERE parent_object_id = OBJECT_ID(N'dbo.RepairableDevices')
              AND name = N'FK_RepairableDevices_Type'
        )
            ALTER TABLE dbo.RepairableDevices
                DROP CONSTRAINT FK_RepairableDevices_Type;

        IF EXISTS
        (
            SELECT 1
            FROM sys.indexes
            WHERE object_id = OBJECT_ID(N'dbo.RepairableDevices')
              AND name = N'IX_RepairableDevices_Type'
        )
            DROP INDEX IX_RepairableDevices_Type
                ON dbo.RepairableDevices;

        DECLARE @defaultConstraint sysname;
        SELECT @defaultConstraint = dc.name
        FROM sys.default_constraints AS dc
        INNER JOIN sys.columns AS c
            ON c.default_object_id = dc.object_id
        WHERE c.object_id = OBJECT_ID(N'dbo.RepairableDevices')
          AND c.name = N'Type';

        IF @defaultConstraint IS NOT NULL
        BEGIN
            DECLARE @dropDefaultSql NVARCHAR(4000) =
                N'ALTER TABLE dbo.RepairableDevices DROP CONSTRAINT ' + QUOTENAME(@defaultConstraint) + N';';
            EXEC sys.sp_executesql @dropDefaultSql;
        END;

        ALTER TABLE dbo.RepairableDevices
            DROP COLUMN [Type];
    END;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;
    THROW;
END CATCH;

SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'dbo'
  AND TABLE_NAME = 'RepairableDevices'
ORDER BY ORDINAL_POSITION;

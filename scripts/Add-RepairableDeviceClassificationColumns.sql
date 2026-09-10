SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID(N'dbo.RepairableDevices', N'U') IS NULL
        THROW 50020, 'dbo.RepairableDevices does not exist.', 1;

    IF OBJECT_ID(N'dbo.RepairableCategories', N'U') IS NULL
        THROW 50021, 'dbo.RepairableCategories does not exist.', 1;

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

    IF COL_LENGTH(N'dbo.RepairableDevices', N'Type') IS NULL
    BEGIN
        ALTER TABLE dbo.RepairableDevices
            ADD [Type] VARCHAR(20) NULL;
    END;

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.RepairableCategories
        WHERE CategoryCode = 'location'
    )
       OR NOT EXISTS
    (
        SELECT 1
        FROM dbo.RepairableCategories
        WHERE CategoryCode = 'Device'
    )
       OR NOT EXISTS
    (
        SELECT 1
        FROM dbo.RepairableCategories
        WHERE CategoryCode = 'parts'
    )
    BEGIN
        THROW 50022, 'Required repairable categories are missing.', 1;
    END;

    EXEC sys.sp_executesql N'
        UPDATE dbo.RepairableDevices
        SET [Type] = CASE
            WHEN CurrentLocationDeviceID IS NULL THEN ''location''
            WHEN MaterialNo IS NULL THEN ''Device''
            ELSE ''parts''
        END
        WHERE [Type] IS NULL;
    ';

    IF EXISTS
    (
        SELECT 1
        FROM sys.columns
        WHERE object_id = OBJECT_ID(N'dbo.RepairableDevices')
          AND name = N'Type'
          AND is_nullable = 1
    )
    BEGIN
        IF EXISTS
        (
            SELECT 1
            FROM sys.foreign_keys
            WHERE parent_object_id = OBJECT_ID(N'dbo.RepairableDevices')
              AND name = N'FK_RepairableDevices_Type'
        )
        BEGIN
            ALTER TABLE dbo.RepairableDevices
                DROP CONSTRAINT FK_RepairableDevices_Type;
        END;

        IF EXISTS
        (
            SELECT 1
            FROM sys.indexes
            WHERE object_id = OBJECT_ID(N'dbo.RepairableDevices')
              AND name = N'IX_RepairableDevices_Type'
        )
        BEGIN
            DROP INDEX IX_RepairableDevices_Type
                ON dbo.RepairableDevices;
        END;

        EXEC sys.sp_executesql N'
            ALTER TABLE dbo.RepairableDevices
                ALTER COLUMN [Type] VARCHAR(20) NOT NULL;
        ';
    END;

    IF NOT EXISTS
    (
        SELECT 1
        FROM sys.foreign_keys
        WHERE parent_object_id = OBJECT_ID(N'dbo.RepairableDevices')
          AND name = N'FK_RepairableDevices_Type'
    )
    BEGIN
        EXEC sys.sp_executesql N'
            ALTER TABLE dbo.RepairableDevices WITH CHECK
                ADD CONSTRAINT FK_RepairableDevices_Type
                FOREIGN KEY ([Type])
                REFERENCES dbo.RepairableCategories (CategoryCode);

            ALTER TABLE dbo.RepairableDevices
                CHECK CONSTRAINT FK_RepairableDevices_Type;
        ';
    END;

    IF NOT EXISTS
    (
        SELECT 1
        FROM sys.indexes
        WHERE object_id = OBJECT_ID(N'dbo.RepairableDevices')
          AND name = N'IX_RepairableDevices_Type'
    )
    BEGIN
        EXEC sys.sp_executesql N'
            CREATE NONCLUSTERED INDEX IX_RepairableDevices_Type
                ON dbo.RepairableDevices ([Type]);
        ';
    END;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;

EXEC sys.sp_executesql N'
    SELECT
        [Type],
        COUNT_BIG(*) AS TotalRows
    FROM dbo.RepairableDevices
    GROUP BY [Type]
    ORDER BY [Type];
';

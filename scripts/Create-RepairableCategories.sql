SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID(N'dbo.RepairableCategories', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.RepairableCategories
        (
            CategoryID INT IDENTITY(1, 1) NOT NULL,
            CategoryName NVARCHAR(50) NOT NULL,
            CategoryCode VARCHAR(20) NOT NULL,
            SortOrder INT NOT NULL,
            IsActive BIT NOT NULL
                CONSTRAINT DF_RepairableCategories_IsActive DEFAULT (1),
            CreatedAt DATETIME2(0) NOT NULL
                CONSTRAINT DF_RepairableCategories_CreatedAt DEFAULT SYSUTCDATETIME(),
            UpdatedAt DATETIME2(0) NOT NULL
                CONSTRAINT DF_RepairableCategories_UpdatedAt DEFAULT SYSUTCDATETIME(),
            CONSTRAINT PK_RepairableCategories
                PRIMARY KEY CLUSTERED (CategoryID),
            CONSTRAINT UQ_RepairableCategories_CategoryName
                UNIQUE (CategoryName),
            CONSTRAINT UQ_RepairableCategories_CategoryCode
                UNIQUE (CategoryCode),
            CONSTRAINT CK_RepairableCategories_SortOrder
                CHECK (SortOrder > 0)
        );
    END;

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.RepairableCategories
        WHERE CategoryCode = 'location'
    )
    BEGIN
        INSERT INTO dbo.RepairableCategories
            (CategoryName, CategoryCode, SortOrder)
        VALUES
            (N'位置', 'location', 1);
    END;

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.RepairableCategories
        WHERE CategoryCode = 'Device'
    )
    BEGIN
        INSERT INTO dbo.RepairableCategories
            (CategoryName, CategoryCode, SortOrder)
        VALUES
            (N'設備', 'Device', 2);
    END;

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.RepairableCategories
        WHERE CategoryCode = 'parts'
    )
    BEGIN
        INSERT INTO dbo.RepairableCategories
            (CategoryName, CategoryCode, SortOrder)
        VALUES
            (N'零件', 'parts', 3);
    END;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;

SELECT
    CategoryID,
    CategoryName,
    CategoryCode,
    SortOrder,
    IsActive,
    CreatedAt,
    UpdatedAt
FROM dbo.RepairableCategories
ORDER BY SortOrder, CategoryID;

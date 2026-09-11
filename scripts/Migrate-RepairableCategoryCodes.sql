SET NOCOUNT ON;
SET XACT_ABORT ON;

/*
   RepairableDevices no longer stores a category/type column.  This migration
   is retained for deployments that still have the legacy category labels;
   it normalizes the category metadata only.
*/
BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID(N'dbo.RepairableCategories', N'U') IS NULL
        THROW 50120, 'dbo.RepairableCategories does not exist.', 1;

    IF EXISTS
    (
        SELECT 1
        FROM dbo.RepairableCategories
        WHERE CategoryCode = 'Device'
    )
       AND NOT EXISTS
    (
        SELECT 1
        FROM dbo.RepairableCategories
        WHERE CategoryCode = 'repairable'
    )
    BEGIN
        UPDATE dbo.RepairableCategories
        SET CategoryCode = 'repairable',
            CategoryName = N'可修件',
            UpdatedAt = SYSUTCDATETIME()
        WHERE CategoryCode = 'Device';
    END;

    IF EXISTS
    (
        SELECT 1
        FROM dbo.RepairableCategories
        WHERE CategoryCode = 'parts'
    )
       AND NOT EXISTS
    (
        SELECT 1
        FROM dbo.RepairableCategories
        WHERE CategoryCode = 'non_repairable'
    )
    BEGIN
        UPDATE dbo.RepairableCategories
        SET CategoryCode = 'non_repairable',
            CategoryName = N'非可修件',
            UpdatedAt = SYSUTCDATETIME()
        WHERE CategoryCode = 'parts';
    END;

    UPDATE dbo.RepairableCategories
    SET CategoryName = CASE CategoryCode
            WHEN 'location' THEN N'位置'
            WHEN 'repairable' THEN N'可修件'
            WHEN 'non_repairable' THEN N'非可修件'
            ELSE CategoryName
        END,
        UpdatedAt = SYSUTCDATETIME()
    WHERE CategoryCode IN ('location', 'repairable', 'non_repairable');

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;

SELECT CategoryID, CategoryName, CategoryCode, SortOrder, IsActive
FROM dbo.RepairableCategories
ORDER BY SortOrder, CategoryID;

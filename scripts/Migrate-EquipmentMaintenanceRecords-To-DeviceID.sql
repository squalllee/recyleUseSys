/* Replace Id with DeviceId; device-owned fields come from RepairableDevices. */
SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRANSACTION;
BEGIN TRY
    IF OBJECT_ID(N'dbo.RepairableDevices', N'U') IS NULL
        THROW 50100, 'dbo.RepairableDevices does not exist.', 1;
    IF OBJECT_ID(N'dbo.EquipmentMaintenanceRecords', N'U') IS NULL
        THROW 50101, 'dbo.EquipmentMaintenanceRecords does not exist.', 1;

    IF COL_LENGTH(N'dbo.RepairableDevices', N'PurchaseDate') IS NULL
        ALTER TABLE dbo.RepairableDevices ADD PurchaseDate DATE NULL;

    IF COL_LENGTH(N'dbo.EquipmentMaintenanceRecords', N'DeviceId') IS NULL
    BEGIN
        IF EXISTS
        (
            SELECT emr.MaterialNo, emr.SerialNumber, emr.Id
            FROM dbo.EquipmentMaintenanceRecords AS emr
            INNER JOIN dbo.RepairableDevices AS device
              ON device.MaterialNo = emr.MaterialNo
             AND ISNULL(device.SerialNumber, '') = ISNULL(emr.SerialNumber, '')
            GROUP BY emr.MaterialNo, emr.SerialNumber, emr.Id
            HAVING COUNT(*) > 1
        )
            THROW 50103, 'A legacy record maps to multiple RepairableDevices rows.', 1;

        IF EXISTS
        (
            SELECT device.DeviceID
            FROM dbo.EquipmentMaintenanceRecords AS emr
            INNER JOIN dbo.RepairableDevices AS device
              ON device.MaterialNo = emr.MaterialNo
             AND ISNULL(device.SerialNumber, '') = ISNULL(emr.SerialNumber, '')
            GROUP BY device.DeviceID
            HAVING COUNT(*) > 1
        )
            THROW 50104, 'Multiple legacy records map to one DeviceId.', 1;

        UPDATE device
        SET device.PurchaseDate = source.PurchaseDate,
            device.UpdatedAt = SYSUTCDATETIME()
        FROM dbo.RepairableDevices AS device
        INNER JOIN
        (
            SELECT matched.DeviceID, MAX(emr.PurchaseDate) AS PurchaseDate
            FROM dbo.EquipmentMaintenanceRecords AS emr
            INNER JOIN dbo.RepairableDevices AS matched
              ON matched.MaterialNo = emr.MaterialNo
             AND ISNULL(matched.SerialNumber, '') = ISNULL(emr.SerialNumber, '')
            WHERE emr.PurchaseDate IS NOT NULL
            GROUP BY matched.DeviceID
        ) AS source ON source.DeviceID = device.DeviceID
        WHERE device.PurchaseDate IS NULL;

        -- Preserve legacy rows that cannot be linked instead of silently deleting them.
        IF OBJECT_ID(N'dbo.EquipmentMaintenanceRecords_Unmapped', N'U') IS NULL
        BEGIN
            SELECT TOP (0) emr.*,
                   CAST(NULL AS DATETIME2(0)) AS ArchivedAt,
                   CAST(NULL AS NVARCHAR(200)) AS ArchiveReason
            INTO dbo.EquipmentMaintenanceRecords_Unmapped
            FROM dbo.EquipmentMaintenanceRecords AS emr;
        END;

        INSERT INTO dbo.EquipmentMaintenanceRecords_Unmapped
        SELECT emr.*, SYSUTCDATETIME(), N'No unique RepairableDevices MaterialNo/SerialNumber match'
        FROM dbo.EquipmentMaintenanceRecords AS emr
        WHERE NOT EXISTS
        (
            SELECT 1 FROM dbo.RepairableDevices AS device
            WHERE device.MaterialNo = emr.MaterialNo
              AND ISNULL(device.SerialNumber, '') = ISNULL(emr.SerialNumber, '')
        )
        AND NOT EXISTS
        (
            SELECT 1 FROM dbo.EquipmentMaintenanceRecords_Unmapped AS archived
            WHERE archived.MaterialNo = emr.MaterialNo
              AND archived.SerialNumber = emr.SerialNumber
              AND archived.Id = emr.Id
        );

        IF OBJECT_ID(N'dbo.EquipmentMaintenanceRecords_New', N'U') IS NOT NULL
            THROW 50105, 'dbo.EquipmentMaintenanceRecords_New already exists.', 1;

        CREATE TABLE dbo.EquipmentMaintenanceRecords_New
        (
            MaterialNo VARCHAR(50) NULL,
            DeviceId VARCHAR(64) NOT NULL,
            InChargeID VARCHAR(6) NOT NULL,
            MaintTypeCode VARCHAR(20) NULL,
            MaintTypeOther NVARCHAR(100) NULL,
            MaintStartDate DATE NULL,
            MaintEndDate DATE NULL,
            WorkOrderNumber VARCHAR(50) NULL,
            RemovalDate DATE NULL,
            RemovalLocation NVARCHAR(64) NULL,
            InstallationDate DATE NULL,
            InstallationLocation NVARCHAR(50) NULL,
            FaultReasonCode VARCHAR(20) NULL,
            FaultReasonOther NVARCHAR(200) NULL,
            ActionCode VARCHAR(100) NULL,
            ActionOther NVARCHAR(200) NULL,
            ReplacementParts NVARCHAR(MAX) NULL,
            CompletionDate DATE NULL,
            Remarks NVARCHAR(MAX) NULL,
            CreatedAt DATETIME NULL,
            UpdatedAt DATETIME NULL,
            CONSTRAINT PK_EquipmentMaintenanceRecords_New PRIMARY KEY CLUSTERED (DeviceId),
            CONSTRAINT FK_EquipmentMaintenanceRecords_New_DeviceId
                FOREIGN KEY (DeviceId) REFERENCES dbo.RepairableDevices (DeviceID)
        );

        INSERT INTO dbo.EquipmentMaintenanceRecords_New
        (
            MaterialNo, DeviceId, InChargeID, MaintTypeCode, MaintTypeOther,
            MaintStartDate, MaintEndDate, WorkOrderNumber, RemovalDate, RemovalLocation,
            InstallationDate, InstallationLocation, FaultReasonCode, FaultReasonOther,
            ActionCode, ActionOther, ReplacementParts, CompletionDate, Remarks,
            CreatedAt, UpdatedAt
        )
        SELECT device.MaterialNo, device.DeviceID, emr.InChargeID, emr.MaintTypeCode,
               emr.MaintTypeOther, emr.MaintStartDate, emr.MaintEndDate,
               emr.WorkOrderNumber, emr.RemovalDate, emr.RemovalLocation,
               emr.InstallationDate, emr.InstallationLocation, emr.FaultReasonCode,
               emr.FaultReasonOther, emr.ActionCode, emr.ActionOther,
               emr.ReplacementParts, emr.CompletionDate, emr.Remarks,
               emr.CreatedAt, emr.UpdatedAt
        FROM dbo.EquipmentMaintenanceRecords AS emr
        INNER JOIN dbo.RepairableDevices AS device
          ON device.MaterialNo = emr.MaterialNo
         AND ISNULL(device.SerialNumber, '') = ISNULL(emr.SerialNumber, '');

        IF (SELECT COUNT_BIG(*) FROM dbo.EquipmentMaintenanceRecords_New)
           + (SELECT COUNT_BIG(*) FROM dbo.EquipmentMaintenanceRecords AS emr
              WHERE NOT EXISTS
              (
                  SELECT 1 FROM dbo.RepairableDevices AS device
                  WHERE device.MaterialNo = emr.MaterialNo
                    AND ISNULL(device.SerialNumber, '') = ISNULL(emr.SerialNumber, '')
              ))
           <> (SELECT COUNT_BIG(*) FROM dbo.EquipmentMaintenanceRecords)
            THROW 50106, 'Row-count validation failed before table replacement.', 1;

        DROP TABLE dbo.EquipmentMaintenanceRecords;
        EXEC sys.sp_rename N'dbo.EquipmentMaintenanceRecords_New', N'EquipmentMaintenanceRecords';
        EXEC sys.sp_rename N'dbo.PK_EquipmentMaintenanceRecords_New',
                           N'PK_EquipmentMaintenanceRecords', N'OBJECT';
        EXEC sys.sp_rename N'dbo.FK_EquipmentMaintenanceRecords_New_DeviceId',
                           N'FK_EquipmentMaintenanceRecords_DeviceId', N'OBJECT';
    END;

    ALTER TABLE dbo.EquipmentMaintenanceRecords
        ALTER COLUMN RemovalLocation NVARCHAR(64) NULL;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;

SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'EquipmentMaintenanceRecords'
ORDER BY ORDINAL_POSITION;

IF OBJECT_ID(N'dbo.EquipmentMaintenanceRecords_Unmapped', N'U') IS NULL
    SELECT CAST(0 AS BIGINT) AS UnmappedRecordCount;
ELSE
    SELECT COUNT_BIG(*) AS UnmappedRecordCount
    FROM dbo.EquipmentMaintenanceRecords_Unmapped;

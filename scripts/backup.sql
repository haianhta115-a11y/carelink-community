-- Đổi đường dẫn sang thư mục mà tài khoản dịch vụ SQL Server có quyền ghi.
BACKUP DATABASE [CareLink]
TO DISK = N'C:\SQLBackups\CareLink_full.bak'
WITH INIT, CHECKSUM, STATS = 10;
RESTORE VERIFYONLY FROM DISK = N'C:\SQLBackups\CareLink_full.bak' WITH CHECKSUM;

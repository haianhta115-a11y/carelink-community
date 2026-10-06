namespace CareLink.Application.Common;

public sealed class AppException(int status, string code, string message) : Exception(message)
{
    public int Status { get; } = status;
    public string Code { get; } = code;
    public static AppException NotFound() => new(404, "NOT_FOUND", "Không tìm thấy thông tin bạn yêu cầu.");
    public static AppException Forbidden() => new(403, "FORBIDDEN", "Bạn không có quyền thực hiện thao tác này.");
    public static AppException Conflict(string code, string message) => new(409, code, message);
}

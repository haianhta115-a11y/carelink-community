using CareLink.Application.Common;
using Microsoft.Extensions.Hosting;
namespace CareLink.Infrastructure.Services;

public sealed class SystemClock : IClock { public DateTime UtcNow => DateTime.UtcNow; }
public sealed class BCryptPasswordHasher : IPasswordHasher
{
    public string Hash(string password) => BCrypt.Net.BCrypt.HashPassword(password, 12);
    public bool Verify(string password, string hash) => BCrypt.Net.BCrypt.Verify(password, hash);
}
public sealed class LocalFileStorage(IHostEnvironment environment) : IFileStorage
{
    private readonly string root = Path.GetFullPath(Path.Combine(environment.ContentRootPath, "App_Data", "uploads"));
    public async Task<StoredFile> SaveImageAsync(Stream stream, long length, int maxBytes, string folder)
    {
        if (length <= 0 || length > maxBytes) throw new AppException(length > maxBytes ? 413 : 400, "FILE_INVALID", "Ảnh vượt quá giới hạn dung lượng.");
        var header = new byte[12];
        var read = await stream.ReadAtLeastAsync(header, 12, throwOnEndOfStream: false);
        string extension, contentType;
        if (read >= 3 && header[0] == 0xff && header[1] == 0xd8 && header[2] == 0xff) { extension = ".jpg"; contentType = "image/jpeg"; }
        else if (read >= 8 && header.AsSpan(0, 8).SequenceEqual(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 })) { extension = ".png"; contentType = "image/png"; }
        else if (read >= 12 && System.Text.Encoding.ASCII.GetString(header, 0, 4) == "RIFF" && System.Text.Encoding.ASCII.GetString(header, 8, 4) == "WEBP") { extension = ".webp"; contentType = "image/webp"; }
        else throw new AppException(400, "FILE_INVALID", "Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.");
        var relative = Path.Combine(folder, Guid.NewGuid() + extension);
        var destination = Resolve(relative); Directory.CreateDirectory(Path.GetDirectoryName(destination)!);
        try
        {
            await using var output = File.Create(destination);
            await output.WriteAsync(header.AsMemory(0, read));
            var buffer = new byte[81920]; long total = read; int count;
            while ((count = await stream.ReadAsync(buffer)) > 0)
            {
                total += count;
                if (total > maxBytes) throw new AppException(413, "FILE_INVALID", "Ảnh vượt quá giới hạn dung lượng.");
                await output.WriteAsync(buffer.AsMemory(0, count));
            }
        }
        catch { File.Delete(destination); throw; }
        return new StoredFile(relative.Replace('\\', '/'), contentType);
    }
    public Task<Stream> OpenAsync(string path)
    {
        var filename = Resolve(path);
        if (!File.Exists(filename)) throw AppException.NotFound();
        return Task.FromResult<Stream>(File.OpenRead(filename));
    }
    public void Delete(string path) { var filename = Resolve(path); if (File.Exists(filename)) File.Delete(filename); }
    private string Resolve(string path)
    {
        var full = Path.GetFullPath(Path.Combine(root, path));
        if (!full.StartsWith(root + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)) throw AppException.Forbidden();
        return full;
    }
}

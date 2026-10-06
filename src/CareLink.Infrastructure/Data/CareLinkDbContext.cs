using CareLink.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace CareLink.Infrastructure.Data;
public sealed class CareLinkDbContext(DbContextOptions<CareLinkDbContext> options) : DbContext(options)
{
    protected override void OnModelCreating(ModelBuilder builder)
    {
        builder.Entity<User>(e =>
        {
            e.ToTable("Users"); e.HasKey(x => x.Id); e.HasIndex(x => x.Email).IsUnique();
            e.Property(x => x.Email).HasMaxLength(254); e.Property(x => x.PasswordHash).HasMaxLength(100);
            e.Property(x => x.FullName).HasMaxLength(80); e.Property(x => x.Role).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(20); e.Property(x => x.Phone).HasMaxLength(20);
            e.Property(x => x.Address).HasMaxLength(200); e.Property(x => x.LockedReason).HasMaxLength(1000); e.Property(x => x.AvatarPath).HasMaxLength(300);
        });
        builder.Entity<Category>(e => { e.ToTable("Categories"); e.HasKey(x => x.Id); e.Property(x => x.Id).ValueGeneratedNever(); e.Property(x => x.Name).HasMaxLength(80); e.Property(x => x.Slug).HasMaxLength(80); e.HasIndex(x => x.Slug).IsUnique(); e.Property(x => x.Icon).HasMaxLength(40); e.Property(x => x.GroupKey).HasMaxLength(30); e.Property(x => x.Description).HasMaxLength(200); });
        builder.Entity<SupportRequest>(e =>
        {
            e.ToTable("SupportRequests"); e.HasKey(x => x.Id); e.HasOne(x => x.Requester).WithMany().HasForeignKey(x => x.RequesterId);
            e.HasOne(x => x.Category).WithMany().HasForeignKey(x => x.CategoryId); e.Property(x => x.Title).HasMaxLength(120);
            e.Property(x => x.Description).HasMaxLength(2000); e.Property(x => x.Location).HasMaxLength(200);
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(20); e.Property(x => x.Urgency).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.HiddenReason).HasMaxLength(1000); e.Property(x => x.RowVersion).IsRowVersion();
            e.HasIndex(x => new { x.Status, x.CategoryId, x.Urgency, x.CreatedAt }).IsDescending(false, false, false, true);
            e.HasIndex(x => x.RequesterId);
        });
        builder.Entity<SupportSession>(e =>
        {
            e.ToTable("SupportSessions"); e.HasKey(x => x.Id); e.HasIndex(x => x.RequestId).IsUnique(); e.HasIndex(x => x.HelperId);
            e.HasOne(x => x.Request).WithMany().HasForeignKey(x => x.RequestId); e.HasOne(x => x.Helper).WithMany().HasForeignKey(x => x.HelperId);
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
        });
        builder.Entity<ChatMessage>(e =>
        {
            e.ToTable("ChatMessages", t => t.HasCheckConstraint("CK_Message_Content", "[Content] IS NOT NULL OR [ImagePath] IS NOT NULL"));
            e.HasKey(x => x.Id); e.Property(x => x.Content).HasMaxLength(2000); e.Property(x => x.ImagePath).HasMaxLength(300); e.Property(x => x.ImageContentType).HasMaxLength(40);
            e.HasOne(x => x.Session).WithMany().HasForeignKey(x => x.SessionId); e.HasOne(x => x.Sender).WithMany().HasForeignKey(x => x.SenderId);
            e.HasIndex(x => new { x.SessionId, x.Id });
        });
        builder.Entity<Review>(e =>
        {
            e.ToTable("Reviews", t => t.HasCheckConstraint("CK_Review_Rating", "[Rating] BETWEEN 1 AND 5")); e.HasKey(x => x.Id); e.HasIndex(x => x.SessionId).IsUnique();
            e.Property(x => x.Comment).HasMaxLength(500); e.HasOne(x => x.Session).WithMany().HasForeignKey(x => x.SessionId);
            e.HasOne(x => x.Reviewer).WithMany().HasForeignKey(x => x.ReviewerId); e.HasOne(x => x.Reviewee).WithMany().HasForeignKey(x => x.RevieweeId);
        });
        builder.Entity<Report>(e =>
        {
            e.ToTable("Reports", t => t.HasCheckConstraint("CK_Report_Target", "([TargetType] = 'Request' AND [TargetRequestId] IS NOT NULL AND [TargetUserId] IS NULL) OR ([TargetType] = 'User' AND [TargetUserId] IS NOT NULL AND [TargetRequestId] IS NULL)"));
            e.HasKey(x => x.Id); e.HasOne(x => x.Reporter).WithMany().HasForeignKey(x => x.ReporterId); e.HasOne(x => x.HandledBy).WithMany().HasForeignKey(x => x.HandledById);
            e.HasOne(x => x.TargetRequest).WithMany().HasForeignKey(x => x.TargetRequestId); e.HasOne(x => x.TargetUser).WithMany().HasForeignKey(x => x.TargetUserId);
            e.Property(x => x.TargetType).HasConversion<string>().HasMaxLength(20); e.Property(x => x.Reason).HasConversion<string>().HasMaxLength(30);
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(20); e.Property(x => x.Description).HasMaxLength(1000); e.Property(x => x.AdminNote).HasMaxLength(1000);
            e.HasIndex(x => new { x.Status, x.CreatedAt });
        });
        builder.Entity<RequestStatusHistory>(e =>
        {
            e.ToTable("RequestStatusHistories"); e.HasKey(x => x.Id); e.HasOne(x => x.Request).WithMany().HasForeignKey(x => x.RequestId);
            e.HasOne(x => x.ChangedBy).WithMany().HasForeignKey(x => x.ChangedById); e.Property(x => x.FromStatus).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.ToStatus).HasConversion<string>().HasMaxLength(20); e.Property(x => x.Note).HasMaxLength(1000); e.HasIndex(x => x.RequestId);
        });
        builder.Entity<AuditLog>(e =>
        {
            e.ToTable("AuditLogs"); e.HasKey(x => x.Id); e.HasOne(x => x.Actor).WithMany().HasForeignKey(x => x.ActorId);
            e.Property(x => x.Action).HasMaxLength(50); e.Property(x => x.EntityType).HasMaxLength(50); e.Property(x => x.EntityId).HasMaxLength(50);
            e.Property(x => x.OldValue).HasMaxLength(1000); e.Property(x => x.NewValue).HasMaxLength(1000); e.Property(x => x.Reason).HasMaxLength(1000);
            e.HasIndex(x => new { x.Action, x.CreatedAt });
        });
        foreach (var entity in builder.Model.GetEntityTypes())
        {
            foreach (var foreignKey in entity.GetForeignKeys()) foreignKey.DeleteBehavior = DeleteBehavior.Restrict;
            foreach (var property in entity.GetProperties().Where(p => p.ClrType == typeof(DateTime)))
                property.SetValueConverter(new ValueConverter<DateTime, DateTime>(v => v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc)));
            foreach (var property in entity.GetProperties().Where(p => p.ClrType == typeof(DateTime?)))
                property.SetValueConverter(new ValueConverter<DateTime?, DateTime?>(v => v, v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : null));
        }
    }
}

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using CareLink.Application.Auth;
using CareLink.Application.Common;
using CareLink.Domain;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
namespace CareLink.Infrastructure.Auth;

public sealed class JwtTokenService(IConfiguration config, IClock clock) : ITokenService
{
    public AuthDto Issue(User user)
    {
        var expires = clock.UtcNow.AddMinutes(config.GetValue("Jwt:ExpirationMinutes", 120));
        var claims = new[] { new Claim("sub", user.Id.ToString()), new Claim("email", user.Email), new Claim("name", user.FullName), new Claim("role", user.Role.ToString()), new Claim("ver", user.TokenVersion.ToString()), new Claim("jti", Guid.NewGuid().ToString()) };
        var token = new JwtSecurityToken(config["Jwt:Issuer"], config["Jwt:Audience"], claims, clock.UtcNow, expires, new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]!)), SecurityAlgorithms.HmacSha256));
        return new AuthDto(new JwtSecurityTokenHandler().WriteToken(token), expires, user.ToDto());
    }
}

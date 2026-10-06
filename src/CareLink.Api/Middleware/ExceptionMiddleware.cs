using CareLink.Application.Common;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;

namespace CareLink.Api.Middleware;

public sealed class ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try { await next(context); }
        catch (Exception ex)
        {
            if (context.Response.HasStarted) throw;
            var status = ex switch { AppException app => app.Status, ValidationException => 400, BadHttpRequestException => 400, _ => 500 };
            var code = ex switch { AppException app => app.Code, ValidationException or BadHttpRequestException => "VALIDATION_ERROR", _ => "INTERNAL_ERROR" };
            if (status == 500) logger.LogError(ex, "Request failed: {TraceId}", context.TraceIdentifier);
            var problem = new ProblemDetails
            {
                Status = status, Title = code, Detail = status == 500 ? "Hệ thống gặp sự cố. Vui lòng thử lại sau." : ex.Message,
                Instance = context.Request.Path
            };
            problem.Extensions["code"] = code;
            problem.Extensions["correlationId"] = context.TraceIdentifier;
            if (ex is ValidationException validation)
                problem.Extensions["errors"] = validation.Errors.GroupBy(e => char.ToLowerInvariant(e.PropertyName[0]) + e.PropertyName[1..])
                    .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());
            context.Response.StatusCode = status;
            await context.Response.WriteAsJsonAsync(problem, options: (System.Text.Json.JsonSerializerOptions?)null, contentType: "application/problem+json");
        }
    }
}

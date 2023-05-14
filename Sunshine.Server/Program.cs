using NLog.Web;
using Sunshine.Business;

var builder = WebApplication.CreateBuilder(args);
builder.Host.UseNLog();

var sunshineConfiguration = new SunshineConfiguration();
builder.Configuration.GetSection("SunshineConfiguration").Bind(sunshineConfiguration);

// Add services to the container.
builder.Services.AddRazorPages();
builder.Services.AddServerSideBlazor();
builder.Services.AddSingleton<SunAngleHelper>();
builder.Services.AddSingleton<SunshineCalculater>();
builder.Services.AddSingleton(sunshineConfiguration);
builder.Services.AddBootstrapBlazor();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseHttpsRedirection();

app.UseStaticFiles();

app.UseRouting();

app.MapBlazorHub();
app.MapFallbackToPage("/_Host");

app.Run();

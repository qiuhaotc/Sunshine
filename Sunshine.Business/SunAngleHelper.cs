using Microsoft.Extensions.Logging;

namespace Sunshine.Business;

public class SunAngleHelper
{
    ILogger<SunAngleHelper> Logger { get; }

    public SunAngleHelper(ILogger<SunAngleHelper> logger)
    {
        Logger = logger;
    }

    /// <summary>
    /// 获取太阳角度信息
    /// </summary>
    /// <param name="latitude">纬度</param>
    /// <param name="longitude">经度</param>
    /// <param name="currentDatetime">当前时间</param>
    public SunAngle GetSunAngle(double latitude, double longitude, DateTime currentDatetime)
    {
        var jd = GetJulianDay(currentDatetime); // 儒略日
        var t = GetJulianCentury(jd); // 儒略世纪数

        var L = GetSunLongitude(t); // 太阳黄经
        var δ = GetSunDeclination(t); // 太阳赤纬

        var H = GetHourAngle(jd, longitude, L); // 时角

        var h = GetAltitude(latitude, δ, H); // 高度角
        var A = GetAzimuth(latitude, δ, H); // 方位角

        Logger.LogInformation($"高度角：{h} 方位角: {A}");

        return new SunAngle
        {
            Altitude = h,
            Azimuth = A,
        };
    }

    double GetJulianDay(DateTime dt)
    {
        return (dt.ToUniversalTime().Ticks - 621355968000000000) / 10000000 / 86400 + 2440587.5;
    }

    double GetJulianCentury(double jd)
    {
        return (jd - 2451545) / 36525;
    }

    double GetSunLongitude(double t)
    {
        return (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360;
    }

    double GetSunDeclination(double t)
    {
        return Math.Asin(Math.Sin(23.4393 * Math.PI / 180) * Math.Sin(GetSunLongitude(t) * Math.PI / 180)) * 180 / Math.PI;
    }

    double GetHourAngle(double jd, double lng, double L)
    {
        return ((jd - 2451545) - 0.5 + lng / 360 + L / 360) * 360;
    }

    double GetAltitude(double lat, double δ, double H)
    {
        return Math.Asin(Math.Sin(lat * Math.PI / 180) * Math.Sin(δ * Math.PI / 180) + Math.Cos(lat * Math.PI / 180) * Math.Cos(δ * Math.PI / 180) * Math.Cos(H * Math.PI / 180)) * 180 / Math.PI;
    }

    double GetAzimuth(double lat, double δ, double H)
    {
        return (Math.Acos((Math.Sin(lat * Math.PI / 180) * Math.Cos(H * Math.PI / 180) - Math.Cos(lat * Math.PI / 180) * Math.Tan(δ * Math.PI / 180)) / Math.Sin(GetAltitude(lat, δ, H) * Math.PI / 180)) * 180 / Math.PI + 180) % 360;
    }
}

using Microsoft.Extensions.Logging;
using SunCalcNet;

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

        var data = SunCalc.GetSunPosition(currentDatetime, latitude, longitude);
        Logger.LogDebug($"高度角：{data.Altitude} 方位角: {data.Azimuth}");

        return new SunAngle
        {
            Altitude = data.Altitude,
            Azimuth = data.Azimuth,
        };
    }
}

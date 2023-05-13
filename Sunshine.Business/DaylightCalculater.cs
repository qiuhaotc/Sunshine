using Microsoft.Extensions.Logging;

namespace Sunshine.Business;

public class DaylightCalculater
{
    public DaylightCalculater(ILogger<DaylightCalculater> logger, SunAngleHelper sunAngleHelper)
    {
        Logger = logger;
        SunAngleHelper = sunAngleHelper;
    }

    ILogger<DaylightCalculater> Logger { get; }

    SunAngleHelper SunAngleHelper { get; }

    const int MinutesStep = 30;

    public SunshineInfo GetSunshineInfo(HouseDaylightModel houseDaylightModel)
    {
        var tan = (houseDaylightModel.BlockLevel * houseDaylightModel.BlockLevelHeight - (houseDaylightModel.LevelHeight / 2d)) / houseDaylightModel.Distance;
        var angle = Math.Atan(tan);

        var dateTime = new DateTime(DateTime.Now.Year - 1, 12, 31);
        var timeSpan = new TimeSpan();
        for (var i = 0; i <= 365 * 24 * 60; i += MinutesStep)
        {
            var heightAngle = SunAngleHelper.GetSunAngle(houseDaylightModel.Latitude, houseDaylightModel.Longitude, dateTime.AddMinutes(i));
            if (heightAngle.Altitude >= angle)
            {
                timeSpan = timeSpan.Add(TimeSpan.FromMinutes(MinutesStep));
            }
        }

        return new SunshineInfo
        {
            TotalSunshineTime = timeSpan,
        };
    }
}

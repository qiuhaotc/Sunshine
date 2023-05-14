using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace Sunshine.Business;

public class DaylightCalculater
{
    public DaylightCalculater(ILogger<DaylightCalculater> logger, SunAngleHelper sunAngleHelper, SunshineConfiguration sunshineConfiguration)
    {
        Logger = logger;
        SunAngleHelper = sunAngleHelper;
        SunshineConfiguration = sunshineConfiguration;
    }

    ILogger<DaylightCalculater> Logger { get; }

    SunAngleHelper SunAngleHelper { get; }
    SunshineConfiguration SunshineConfiguration { get; }

    const int MinMinutesStep = 1;

    public SunshineInfo GetSunshineInfo(HouseDaylightModel houseDaylightModel)
    {
        var tan = (houseDaylightModel.BlockLevel * houseDaylightModel.BlockLevelHeight - houseDaylightModel.LevelHeight * houseDaylightModel.Level) / houseDaylightModel.Distance;
        var angle = Math.Atan(tan);
        var dateTimeUtc = new DateTime(houseDaylightModel.Year - 1, 12, 31, 0, 0, 0, DateTimeKind.Utc).AddHours(-houseDaylightModel.TimeZone);
        var minutesStep = SunshineConfiguration.MinutesStep > MinMinutesStep ? SunshineConfiguration.MinutesStep : MinMinutesStep;
        var totalSunshineTime = new TimeSpan();
        var exactSunshineTime = new TimeSpan();
        var timeSpanForSpringEquinox = new TimeSpan();
        var timeSpanForSummerSolstice = new TimeSpan();
        var timeSpanForAutumnalEquinox = new TimeSpan();
        var timeSpanForWinterSolstice = new TimeSpan();
        var currentTimeSpan = TimeSpan.FromMinutes(minutesStep);

        for (var i = 0; i <= 365 * 24 * 60; i += minutesStep)
        {
            var currentUtcDate = dateTimeUtc.AddMinutes(i);
            var currentLocalDate = currentUtcDate.AddHours(houseDaylightModel.TimeZone);
            var heightAngle = SunAngleHelper.GetSunAngle(houseDaylightModel.Latitude, houseDaylightModel.Longitude, currentUtcDate);
            if (heightAngle.Altitude >= angle)
            {
                exactSunshineTime = exactSunshineTime.Add(currentTimeSpan);

                if (currentLocalDate.Month == 3 && currentLocalDate.Day == 21)
                {
                    timeSpanForSpringEquinox = timeSpanForSpringEquinox.Add(currentTimeSpan);
                }
                else if (currentLocalDate.Month == 6 && currentLocalDate.Day == 22)
                {
                    timeSpanForSummerSolstice = timeSpanForSummerSolstice.Add(currentTimeSpan);
                }
                else if (currentLocalDate.Month == 9 && currentLocalDate.Day == 23)
                {
                    timeSpanForAutumnalEquinox = timeSpanForAutumnalEquinox.Add(currentTimeSpan);
                }
                else if (currentLocalDate.Month == 12 && currentLocalDate.Day == 22)
                {
                    timeSpanForWinterSolstice = timeSpanForWinterSolstice.Add(currentTimeSpan);
                }
            }

            if (heightAngle.Altitude >= 0)
            {
                totalSunshineTime = totalSunshineTime.Add(currentTimeSpan);
            }
        }

        var sunshineInfo = new SunshineInfo
        {
            TotalSunshineTime = totalSunshineTime,
            ExactSunshineTime = exactSunshineTime,
            SpringEquinox = timeSpanForSpringEquinox,
            SummerSolstice = timeSpanForSummerSolstice,
            AutumnalEquinox = timeSpanForAutumnalEquinox,
            WinterSolstice = timeSpanForWinterSolstice,
        };

        Logger.LogInformation($"House Daylight Model: {JsonSerializer.Serialize(houseDaylightModel)}, Minutes Step: {minutesStep}, Angle: {angle}, Calculate start from: {dateTimeUtc:yyyy-MM-dd HH:ss:mm}, Sunshine Info: {JsonSerializer.Serialize(sunshineInfo)}");

        return sunshineInfo;
    }
}

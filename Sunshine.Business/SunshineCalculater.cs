using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace Sunshine.Business;

public class SunshineCalculater
{
    public SunshineCalculater(ILogger<SunshineCalculater> logger, SunAngleHelper sunAngleHelper, SunshineConfiguration sunshineConfiguration)
    {
        Logger = logger;
        SunAngleHelper = sunAngleHelper;
        SunshineConfiguration = sunshineConfiguration;
    }

    ILogger<SunshineCalculater> Logger { get; }

    SunAngleHelper SunAngleHelper { get; }
    SunshineConfiguration SunshineConfiguration { get; }

    const int MinMinutesStep = 1;

    public HouseSunshineModel GetSunshineInfo(HouseInputModel houseInputModel)
    {
        var tan = (houseInputModel.BlockLevel * houseInputModel.BlockLevelHeight - houseInputModel.LevelHeight * houseInputModel.Level) / houseInputModel.Distance;
        var angle = Math.Atan(tan);
        var dateTimeUtc = new DateTime(houseInputModel.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc).AddMinutes(-1).AddHours(-houseInputModel.TimeZone);
        var dateTimeToUtc = dateTimeUtc.AddYears(1);
        var minutesStep = SunshineConfiguration.MinutesStep > MinMinutesStep ? SunshineConfiguration.MinutesStep : MinMinutesStep;
        var totalSunshineTime = new TimeSpan();
        var exactSunshineTime = new TimeSpan();
        var timeSpanForSpringEquinox = new TimeSpan();
        var timeSpanForSummerSolstice = new TimeSpan();
        var timeSpanForAutumnalEquinox = new TimeSpan();
        var timeSpanForWinterSolstice = new TimeSpan();
        var timeSpanForGreatCold = new TimeSpan();
        var currentTimeSpan = TimeSpan.FromMinutes(minutesStep);

        for (var currentDateTimeUtc = dateTimeUtc; currentDateTimeUtc < dateTimeToUtc; currentDateTimeUtc = currentDateTimeUtc.AddMinutes(minutesStep))
        {
            var currentLocalDate = currentDateTimeUtc.AddHours(houseInputModel.TimeZone);
            var heightAngle = SunAngleHelper.GetSunAngle(houseInputModel.Latitude, houseInputModel.Longitude, currentDateTimeUtc);
            if (heightAngle.Altitude >= angle)
            {
                exactSunshineTime = exactSunshineTime.Add(currentTimeSpan);

                switch (currentLocalDate.Month)
                {
                    case 1 when currentLocalDate.Day == 20:
                        timeSpanForGreatCold = timeSpanForGreatCold.Add(currentTimeSpan);
                        break;
                    case 3 when currentLocalDate.Day == 21:
                        timeSpanForSpringEquinox = timeSpanForSpringEquinox.Add(currentTimeSpan);
                        break;
                    case 6 when currentLocalDate.Day == 22:
                        timeSpanForSummerSolstice = timeSpanForSummerSolstice.Add(currentTimeSpan);
                        break;
                    case 9 when currentLocalDate.Day == 23:
                        timeSpanForAutumnalEquinox = timeSpanForAutumnalEquinox.Add(currentTimeSpan);
                        break;
                    case 12 when currentLocalDate.Day == 22:
                        timeSpanForWinterSolstice = timeSpanForWinterSolstice.Add(currentTimeSpan);
                        break;
                }
            }

            if (heightAngle.Altitude >= 0)
            {
                totalSunshineTime = totalSunshineTime.Add(currentTimeSpan);
            }
        }

        var sunshineInfo = new HouseSunshineModel
        {
            TotalSunshineTime = totalSunshineTime,
            ExactSunshineTime = exactSunshineTime,
            SpringEquinox = timeSpanForSpringEquinox,
            SummerSolstice = timeSpanForSummerSolstice,
            AutumnalEquinox = timeSpanForAutumnalEquinox,
            WinterSolstice = timeSpanForWinterSolstice,
            GreatCold = timeSpanForGreatCold,
        };

        Logger.LogInformation($"House Input Model: {JsonSerializer.Serialize(houseInputModel)}, Minutes Step: {minutesStep}, Angle: {angle}, Calculate start from: {dateTimeUtc:yyyy-MM-dd HH:ss:mm} to {dateTimeToUtc:yyyy-MM-dd HH:ss:mm}, Sunshine Info: {JsonSerializer.Serialize(sunshineInfo)}");

        return sunshineInfo;
    }
}

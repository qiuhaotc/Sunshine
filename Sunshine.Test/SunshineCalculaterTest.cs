namespace Sunshine.Test;

class SunshineCalculaterTest
{
    [TestCaseSource(nameof(CalculatorTestCases))]
    public void TestSunshineCalculater_GetHouseSunshineModel((HouseInputModel InputModel, HouseSunshineModel Result) testCase)
    {
        var calculater = new SunshineCalculater(new Mock<ILogger<SunshineCalculater>>().Object, new SunAngleHelper(), new SunshineConfiguration());
        var sunshineModel = calculater.GetHouseSunshineModel(testCase.InputModel);
        sunshineModel.Should().BeEquivalentTo(testCase.Result);
    }

    [Test]
    public void TestSunshineCalculater_GetHouseSunshineModel_MinutesStep()
    {
        var configuration = new SunshineConfiguration { MinutesStep = 10 };
        var calculater = new SunshineCalculater(new Mock<ILogger<SunshineCalculater>>().Object, new SunAngleHelper(), configuration);
        var model = new HouseInputModel
        {
            BlockLevel = 18,
            BlockLevelHeight = 3.1,
            Distance = 60d,
            Latitude = 32.123563,
            Level = 12,
            LevelHeight = 3.12,
            Longitude = 118.152345,
            TimeZone = 8,
            Year = 2023
        };
        var sunshineModel = calculater.GetHouseSunshineModel(model);

        sunshineModel.Should().BeEquivalentTo(new HouseSunshineModel
        {
            AutumnalEquinox = TimeSpan.FromMinutes(550),
            ExactSunshineTime = TimeSpan.FromMinutes(200480),
            GreatCold = TimeSpan.FromMinutes(430),
            SpringEquinox = TimeSpan.FromMinutes(560),
            SummerSolstice = TimeSpan.FromMinutes(670),
            TotalSunshineTime = TimeSpan.FromMinutes(263610),
            WinterSolstice = TimeSpan.FromMinutes(400),
        });

        configuration.MinutesStep = 0;
        sunshineModel = calculater.GetHouseSunshineModel(model);
        sunshineModel.Should().BeEquivalentTo(new HouseSunshineModel
        {
            AutumnalEquinox = TimeSpan.FromMinutes(559),
            ExactSunshineTime = TimeSpan.FromMinutes(200469),
            GreatCold = TimeSpan.FromMinutes(425),
            SpringEquinox = TimeSpan.FromMinutes(558),
            SummerSolstice = TimeSpan.FromMinutes(672),
            TotalSunshineTime = TimeSpan.FromMinutes(263569),
            WinterSolstice = TimeSpan.FromMinutes(397),
        }, "Set minutes step less than 1, will use 1 as the default minutes step");
    }

    static List<(HouseInputModel InputModel, HouseSunshineModel Result)> CalculatorTestCases
    {
        get
        {
            return new List<(HouseInputModel InputModel, HouseSunshineModel Result)>() {
                (
                    new HouseInputModel
                    {
                        BlockLevel = 18,
                        BlockLevelHeight = 3.1,
                        Distance = 60d,
                        Latitude = 32.123563,
                        Level = 12,
                        LevelHeight = 3.12,
                        Longitude = 118.152345,
                        TimeZone = 8,
                        Year = 2023
                    },
                    new HouseSunshineModel
                    {
                        AutumnalEquinox = TimeSpan.FromMinutes(559),
                        ExactSunshineTime = TimeSpan.FromMinutes(200469),
                        GreatCold = TimeSpan.FromMinutes(425),
                        SpringEquinox = TimeSpan.FromMinutes(558),
                        SummerSolstice = TimeSpan.FromMinutes(672),
                        TotalSunshineTime = TimeSpan.FromMinutes(263569),
                        WinterSolstice = TimeSpan.FromMinutes(397),
                    }
                ),
                (
                    new HouseInputModel
                    {
                        BlockLevel = 18,
                        BlockLevelHeight = 3.1,
                        Distance = 60d,
                        Latitude = -32.123563,
                        Level = 12,
                        LevelHeight = 3.12,
                        Longitude = -118.152345,
                        TimeZone = 8,
                        Year = 2023
                    },
                    new HouseSunshineModel
                    {
                        AutumnalEquinox = TimeSpan.FromMinutes(558),
                        ExactSunshineTime = TimeSpan.FromMinutes(198811),
                        GreatCold = TimeSpan.FromMinutes(657),
                        SpringEquinox = TimeSpan.FromMinutes(558),
                        SummerSolstice = TimeSpan.FromMinutes(396),
                        TotalSunshineTime = TimeSpan.FromMinutes(262046),
                        WinterSolstice = TimeSpan.FromMinutes(672),
                    }
                ),
                (
                    new HouseInputModel
                    {
                        BlockLevel = 18,
                        BlockLevelHeight = 3.1,
                        Distance = 60d,
                        Latitude = 32.123563,
                        Level = 12,
                        LevelHeight = 3.1,
                        Longitude = 118.152345,
                        TimeZone = 8,
                        Year = 2024
                    },
                    new HouseSunshineModel
                    {
                        AutumnalEquinox = TimeSpan.FromMinutes(555),
                        ExactSunshineTime = TimeSpan.FromMinutes(200057),
                        GreatCold = TimeSpan.FromMinutes(422),
                        SpringEquinox = TimeSpan.FromMinutes(558),
                        SummerSolstice = TimeSpan.FromMinutes(670),
                        TotalSunshineTime = TimeSpan.FromMinutes(264150),
                        WinterSolstice = TimeSpan.FromMinutes(394),
                    }
                ),
                (
                    new HouseInputModel
                    {
                        BlockLevel = 12,
                        BlockLevelHeight = 3.1,
                        Distance = 60d,
                        Latitude = 32.123563,
                        Level = 12,
                        LevelHeight = 3.1,
                        Longitude = 118.152345,
                        TimeZone = 8,
                        Year = 2022
                    },
                    new HouseSunshineModel
                    {
                        AutumnalEquinox = TimeSpan.FromMinutes(720),
                        ExactSunshineTime = TimeSpan.FromMinutes(263570),
                        GreatCold = TimeSpan.FromMinutes(613),
                        SpringEquinox = TimeSpan.FromMinutes(720),
                        SummerSolstice = TimeSpan.FromMinutes(846),
                        TotalSunshineTime = TimeSpan.FromMinutes(263570),
                        WinterSolstice = TimeSpan.FromMinutes(594),
                    }
                )
            };
        }
    }

    static string GetTheResultValue(HouseSunshineModel sunshineModel)
    {
        return $@"
            new HouseSunshineModel
            {{
                AutumnalEquinox = TimeSpan.FromMinutes({sunshineModel.AutumnalEquinox.TotalMinutes}),
                ExactSunshineTime = TimeSpan.FromMinutes({sunshineModel.ExactSunshineTime.TotalMinutes}),
                GreatCold = TimeSpan.FromMinutes({sunshineModel.GreatCold.TotalMinutes}),
                SpringEquinox = TimeSpan.FromMinutes({sunshineModel.SpringEquinox.TotalMinutes}),
                SummerSolstice = TimeSpan.FromMinutes({sunshineModel.SummerSolstice.TotalMinutes}),
                TotalSunshineTime = TimeSpan.FromMinutes({sunshineModel.TotalSunshineTime.TotalMinutes}),
                WinterSolstice = TimeSpan.FromMinutes({sunshineModel.WinterSolstice.TotalMinutes}),
            }}";
    }
}

namespace Sunshine.Test;

class SunAngleHelperTest
{
    [TestCase(32.3, 115.33, 2023, 1, 5, -1.012, 0.111)]
    [TestCase(-32.3, 115.33, 2023, 1, 5, -1.422, 0.551)]
    public void TestGetSunAngle(double latitude, double longitude, int year, int month, int day, double azimuth, double altitude)
    {
        var sunAngleHelper = new SunAngleHelper();
        var sunAngle = sunAngleHelper.GetSunAngle(latitude, longitude, new DateTime(year, month, day, 0, 0, 0, DateTimeKind.Utc));
        Assert.Multiple(() =>
        {
            Assert.That(sunAngle.Azimuth, Is.EqualTo(azimuth).Within(0.001));
            Assert.That(sunAngle.Altitude, Is.EqualTo(altitude).Within(0.001));
        });
    }
}

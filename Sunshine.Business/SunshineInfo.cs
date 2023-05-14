namespace Sunshine.Business;

public class SunshineInfo
{
    public TimeSpan ExactSunshineTime { get; internal set; }
    public TimeSpan SpringEquinox { get; internal set; }
    public TimeSpan SummerSolstice { get; internal set; }
    public TimeSpan AutumnalEquinox { get; internal set; }
    public TimeSpan WinterSolstice { get; internal set; }
    public TimeSpan TotalSunshineTime { get; internal set; }
    public TimeSpan GreatCold { get; internal set; }
}

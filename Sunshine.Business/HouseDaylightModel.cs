namespace Sunshine.Business;

public class HouseDaylightModel
{
    /// <summary>
    /// 经度
    /// </summary>
    public double Longitude { get; set; }

    /// <summary>
    /// 纬度
    /// </summary>
    public double Latitude { get; set; }

    /// <summary>
    /// 所在楼层
    /// </summary>
    public int Level { get; set; }

    /// <summary>
    /// 层高
    /// </summary>
    public double LevelHeight { get; set; }

    /// <summary>
    /// 楼间距
    /// </summary>
    public double Distance { get; set; }

    /// <summary>
    /// 前面遮挡的楼层数
    /// </summary>
    public int BlockLevel { get; set; }


    /// <summary>
    /// 前面遮挡的楼层层高
    /// </summary>
    public double BlockLevelHeight { get; set; }

    /// <summary>
    /// 当前时间
    /// </summary>
    public DateTime? CurrentDateTime { get; set; }

    /// <summary>
    /// 时区
    /// </summary>
    public int TimeZone { get; set; }
}

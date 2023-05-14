using System.ComponentModel.DataAnnotations;
using BootstrapBlazor.Components;
using Sunshine.Business;

namespace Sunshine.Server;

public class HouseInputViewModel
{
    /// <summary>
    /// 经度
    /// </summary>
    [Required(ErrorMessage = ErrorMessageForRequired)]
    [Display(Name = "经度")]
    [AutoGenerateColumn(Order = 2, Step = 0.000001)]
    [Range(-180d, 180d, ErrorMessage = ErrorMessageForRange)]
    public double Longitude { get; set; } = 118.794135;

    /// <summary>
    /// 纬度
    /// </summary>
    [Required(ErrorMessage = ErrorMessageForRequired)]
    [Range(-90d, 90d, ErrorMessage = ErrorMessageForRange)]
    [AutoGenerateColumn(Order = 4, Step = 0.000001)]
    [Display(Name = "纬度")]
    public double Latitude { get; set; } = 32.072277;

    /// <summary>
    /// 所在楼层
    /// </summary>
    [Required(ErrorMessage = ErrorMessageForRequired)]
    [Range(1, 1000, ErrorMessage = ErrorMessageForRange)]
    [AutoGenerateColumn(Order = 8)]
    [Display(Name = "所在楼层")]
    public int Level { get; set; } = 12;

    /// <summary>
    /// 层高
    /// </summary>
    [Required(ErrorMessage = ErrorMessageForRequired)]
    [Range(1, 20, ErrorMessage = ErrorMessageForRange)]
    [AutoGenerateColumn(Order = 10)]
    [Display(Name = "层高(m)")]
    public double LevelHeight { get; set; } = 3.1;

    /// <summary>
    /// 楼间距
    /// </summary>
    [Required(ErrorMessage = ErrorMessageForRequired)]
    [Range(1, 200, ErrorMessage = ErrorMessageForRange)]
    [AutoGenerateColumn(Order = 17)]
    [Display(Name = "楼间距(m)")]
    public double Distance { get; set; } = 60d;

    /// <summary>
    /// 前面遮挡的总楼层数(无需减去当前楼层数)
    /// </summary>
    [Required(ErrorMessage = ErrorMessageForRequired)]
    [Range(1, 1000, ErrorMessage = ErrorMessageForRange)]
    [AutoGenerateColumn(Order = 14)]
    [Display(Name = "前面遮挡的总楼层数(无需减去当前楼层数)")]
    public int BlockLevel { get; set; } = 18;

    /// <summary>
    /// 前面遮挡的楼层层高
    /// </summary>
    [Required(ErrorMessage = ErrorMessageForRequired)]
    [Range(1, 20, ErrorMessage = ErrorMessageForRange)]
    [AutoGenerateColumn(Order = 16)]
    [Display(Name = "前面遮挡的楼层层高(m)")]
    public double BlockLevelHeight { get; set; } = 3.1;

    /// <summary>
    /// 时区
    /// </summary>
    [Required(ErrorMessage = ErrorMessageForRequired)]
    [Range(-12, 12, ErrorMessage = ErrorMessageForRange)]
    [AutoGenerateColumn(Order = 18)]
    [Display(Name = "时区")]
    public int TimeZone { get; set; } = 8;

    /// <summary>
    /// 年份
    /// </summary>
    [AutoGenerateColumn(Order = 20)]
    [Required(ErrorMessage = ErrorMessageForRequired)]
    [Range(1900, 9999, ErrorMessage = ErrorMessageForRange)]
    [Display(Name = "年份")]
    public int Year { get; set; } = DateTime.Now.Year;

    const string ErrorMessageForRequired = "{0}不能为空";
    const string ErrorMessageForRange = "{0}范围是{1}到{2}";

    public HouseInputModel GetHouseInputModel()
    {
        return new HouseInputModel
        {
            BlockLevel = BlockLevel,
            BlockLevelHeight = BlockLevelHeight,
            Year = Year,
            TimeZone = TimeZone,
            Distance = Distance,
            Latitude = Latitude,
            Longitude = Longitude,
            Level = Level,
            LevelHeight = LevelHeight,
        };
    }
}

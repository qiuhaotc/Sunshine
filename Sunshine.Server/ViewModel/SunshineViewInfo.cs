using System.ComponentModel.DataAnnotations;
using BootstrapBlazor.Components;
using Sunshine.Business;

namespace Sunshine.Server;

public class SunshineViewInfo
{
    /// <summary>
    /// 房屋日照时间
    /// </summary>
    [AutoGenerateColumn(Order = 12, Readonly = true)]
    [Display(Name = "房屋日照时间")]
    public string ExactSunshineTime { get; set; } = string.Empty;

    /// <summary>
    /// 总日照时间
    /// </summary>
    [AutoGenerateColumn(Order = 16, Readonly = true)]
    [Display(Name = "总日照时间")]
    public string TotalSunshineTime { get; set; } = string.Empty;

    /// <summary>
    /// 总日照时间
    /// </summary>
    [AutoGenerateColumn(Order = 18, Readonly = true)]
    [Display(Name = "日照时间百分比")]
    public string SunshineTimePercent { get; set; } = string.Empty;

    /// <summary>
    /// 春分
    /// </summary>
    [AutoGenerateColumn(Order = 20, Readonly = true)]
    [Display(Name = "春分 3月21日")]
    public string SpringEquinox { get; set; } = string.Empty;

    /// <summary>
    /// 夏至
    /// </summary>
    [AutoGenerateColumn(Order = 24, Readonly = true)]
    [Display(Name = "夏至 6月22日")]
    public string SummerSolstice { get; set; } = string.Empty;

    /// <summary>
    /// 秋分
    /// </summary>
    [AutoGenerateColumn(Order = 28, Readonly = true)]
    [Display(Name = "秋分 9月23日")]
    public string AutumnalEquinox { get; set; } = string.Empty;

    /// <summary>
    /// 冬至
    /// </summary>
    [AutoGenerateColumn(Order = 32, Readonly = true)]
    [Display(Name = "冬至 12月22日")]
    public string WinterSolstice { get; set; } = string.Empty;

    /// <summary>
    /// 大寒
    /// </summary>
    [AutoGenerateColumn(Order = 32, Readonly = true)]
    [Display(Name = "大寒 1月20日")]
    public string GreatCold { get; set; } = string.Empty;

    public void SetSunshineInfo(SunshineInfo sunshineInfo)
    {
        TotalSunshineTime = $"{sunshineInfo.TotalSunshineTime.TotalHours:F1}小时";
        ExactSunshineTime = $"{sunshineInfo.ExactSunshineTime.TotalHours:F1}小时";
        SpringEquinox = $"{sunshineInfo.SpringEquinox.TotalHours:F1}小时";
        SummerSolstice = $"{sunshineInfo.SummerSolstice.TotalHours:F1}小时";
        AutumnalEquinox = $"{sunshineInfo.AutumnalEquinox.TotalHours:F1}小时";
        WinterSolstice = $"{sunshineInfo.WinterSolstice.TotalHours:F1}小时";
        GreatCold = $"{sunshineInfo.GreatCold.TotalHours:F1}小时";

        SunshineTimePercent = $"{(sunshineInfo.TotalSunshineTime.TotalHours == 0 ? 1d : sunshineInfo.ExactSunshineTime.TotalHours / sunshineInfo.TotalSunshineTime.TotalHours) * 100:F1}%";
    }
}

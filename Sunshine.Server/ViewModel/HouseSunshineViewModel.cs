﻿using System.ComponentModel.DataAnnotations;
using BootstrapBlazor.Components;
using Sunshine.Business;

namespace Sunshine.Server;

public class HouseSunshineViewModel
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

    [AutoGenerateColumn(Ignore = true)]
    public string ValidateResult { get; set; } = string.Empty;

    [AutoGenerateColumn(Ignore = true)]
    public Color ValidateResultColor { get; set; }

    [AutoGenerateColumn(Ignore = true)]
    public bool ValidateResultVisible { get; set; }

    public void SetSunshineInfo(HouseSunshineModel houseSunshineModel)
    {
        TotalSunshineTime = $"{houseSunshineModel.TotalSunshineTime.TotalHours:F3}小时";
        ExactSunshineTime = $"{houseSunshineModel.ExactSunshineTime.TotalHours:F3}小时";
        SpringEquinox = $"{houseSunshineModel.SpringEquinox.TotalHours:F3}小时";
        SummerSolstice = $"{houseSunshineModel.SummerSolstice.TotalHours:F3}小时";
        AutumnalEquinox = $"{houseSunshineModel.AutumnalEquinox.TotalHours:F3}小时";
        WinterSolstice = $"{houseSunshineModel.WinterSolstice.TotalHours:F3}小时";
        GreatCold = $"{houseSunshineModel.GreatCold.TotalHours:F3}小时";

        SunshineTimePercent = $"{(houseSunshineModel.TotalSunshineTime.TotalHours == 0 ? 1d : houseSunshineModel.ExactSunshineTime.TotalHours / houseSunshineModel.TotalSunshineTime.TotalHours) * 100:F3}%";

        ValidateResultVisible = true;

        if (houseSunshineModel.GreatCold >= TimeSpan.FromHours(2) && houseSunshineModel.WinterSolstice >= TimeSpan.FromHours(1))
        {
            ValidateResult = "房屋日照时间在大寒大于两小时, 冬至大于一小时";
            ValidateResultColor = Color.Success;
        }
        else
        {
            ValidateResult = "房屋日照时间在大寒小于两小时或冬至小于一小时";
            ValidateResultColor = Color.Danger;
        }
    }
}

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
    public string TimeSpanString { get; set; } = string.Empty;

    public void SetSunshineInfo(SunshineInfo sunshineInfo)
    {
        TimeSpanString = $"{sunshineInfo.TotalSunshineTime.TotalHours.ToString("F1")}小时";
    }
}

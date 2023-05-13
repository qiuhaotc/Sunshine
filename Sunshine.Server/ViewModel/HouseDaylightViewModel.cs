using System.ComponentModel.DataAnnotations;
using BootstrapBlazor.Components;

namespace Sunshine.Server;

public class HouseDaylightViewModel
{
    /// <summary>
    /// 经度
    /// </summary>
    [Required(ErrorMessage = "{0}不能为空")]
    [Display(Name = "经度")]
    [AutoGenerateColumn(Order = 2)]
    [Range(-180d, 180d, ErrorMessage = "{0}范围是-180到+180")]
    public double Longitude { get; set; }

    /// <summary>
    /// 纬度
    /// </summary>
    [Required(ErrorMessage = "{0}不能为空")]
    [Range(-90d, 90d, ErrorMessage = "{0}范围是-90到+90")]
    [AutoGenerateColumn(Order = 4)]
    [Display(Name = "纬度")]
    public double Latitude { get; set; }

    /// <summary>
    /// 当前时间
    /// </summary>
    [AutoGenerateColumn(Order = 6)]
    [Display(Name = "当前时间")]
    public DateTime? CurrentDateTime { get; set; }
}

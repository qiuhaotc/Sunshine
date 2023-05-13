using System.ComponentModel.DataAnnotations;
using BootstrapBlazor.Components;

namespace Sunshine.Server;

public class HouseDaylightResultViewModel
{
    /// <summary>
    /// 高度角
    /// </summary>
    [Display(Name = "高度角")]
    [AutoGenerateColumn(Order = 2, Readonly = true)]
    public double Altitude { get; set; }

    /// <summary>
    /// 方位角
    /// </summary>
    [AutoGenerateColumn(Order = 4, Readonly = true)]
    [Display(Name = "方位角")]
    public double Azimuth { get; set; }
}

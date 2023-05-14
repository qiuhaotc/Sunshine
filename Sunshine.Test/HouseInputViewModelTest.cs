
using System.Globalization;
using System.Runtime.CompilerServices;
using BootstrapBlazor.Components;

namespace Sunshine.Test;

class HouseInputViewModelTest
{
    [Test]
    public void TestInitAreas()
    {
        var model = new HouseInputViewModel();
        var areas = (SelectedItem[])model.AreasSelectedItems;
        Assert.That(areas, Has.Length.EqualTo(342));
        Assert.That(areas.All(u =>
        {
            var values = u.Value.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            return values.Length == 2 && double.TryParse(values[0], CultureInfo.InvariantCulture, out var longitude) && double.TryParse(values[1], CultureInfo.InvariantCulture, out var latitude) || u.Text == "请选择 ..." && u.Value == string.Empty;
        }), Is.True);
    }
}

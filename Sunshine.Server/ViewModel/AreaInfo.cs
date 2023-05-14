using System.Text.Json.Serialization;

namespace Sunshine.Server
{
    public class AreaInfo
    {
        [JsonPropertyName("city")]
        public string City { get; set; } = string.Empty;
        [JsonPropertyName("country")]
        public string Country { get; set; } = string.Empty;
        [JsonPropertyName("province")]
        public string Province { get; set; } = string.Empty;
        [JsonPropertyName("lng")]
        public string Longitude { get; set; } = string.Empty;
        [JsonPropertyName("lat")]
        public string Latitude { get; set; } = string.Empty;
    }
}

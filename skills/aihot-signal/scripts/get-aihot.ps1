[CmdletBinding()]
param(
    [ValidateSet("selected", "all", "daily")]
    [string]$Mode = "selected",

    [ValidateRange(1, 100)]
    [int]$Take = 50,

    [string]$Query,

    [string]$Category,

    [string]$BaseUrl = $env:AIHOT_BASE_URL,

    [ValidatePattern('^\d{4}-\d{2}-\d{2}$')]
    [string]$Date
)

$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($BaseUrl)) {
    throw "Missing AI HOT endpoint. Set AIHOT_BASE_URL or pass -BaseUrl."
}
$baseUrl = $BaseUrl.TrimEnd('/')
$headers = @{ "User-Agent" = "Mozilla/5.0 content-os-aihot-signal" }

if ($Mode -eq "daily") {
    $path = if ($Date) { "/api/public/daily/$Date" } else { "/api/public/daily" }
    $uri = "$baseUrl$path"
}
else {
    if ($Date) {
        throw "-Date 只适用于 -Mode daily。"
    }

    $parameters = [System.Collections.Generic.List[string]]::new()
    $parameters.Add("mode=$([uri]::EscapeDataString($Mode))")
    $parameters.Add("take=$Take")

    if ($Query) {
        $parameters.Add("q=$([uri]::EscapeDataString($Query))")
    }
    if ($Category) {
        $parameters.Add("category=$([uri]::EscapeDataString($Category))")
    }

    $uri = "$baseUrl/api/public/items?$($parameters -join '&')"
}

$response = Invoke-RestMethod -Headers $headers -Uri $uri -Method Get -TimeoutSec 30
$response | ConvertTo-Json -Depth 10

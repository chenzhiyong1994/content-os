[CmdletBinding()]
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Rest
)

$ErrorActionPreference = 'Stop'

$scriptPath = Join-Path $PSScriptRoot 'wechat-publish-prep.mjs'

foreach ($name in @('WECHAT_MP_APP_ID', 'WECHAT_MP_APP_SECRET', 'WECHAT_MP_AUTHOR')) {
    if ([string]::IsNullOrWhiteSpace((Get-Item -Path "Env:$name" -ErrorAction SilentlyContinue).Value)) {
        $userValue = [System.Environment]::GetEnvironmentVariable($name, 'User')
        if (-not [string]::IsNullOrWhiteSpace($userValue)) {
            Set-Item -Path "Env:$name" -Value $userValue
        }
    }
}

& node $scriptPath @Rest
exit $LASTEXITCODE

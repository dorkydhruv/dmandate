SPL-token: 99X4WCD2zytYTQsdsWsrtepWtt2K5orjfQWPThuZ34Ru
spl-account: BiUGw3s1UWtookGaX2VwtQso7i1Zb7eG928nYGg8Zj3L
target account: 4tMN5HYmfpsAFgcxG2Ng14pfJwoy8f4Kz2V6n8tgPyim

register - yarn dev register-user dhruvv -s
create - yarn dev create-mandate <TARGET_ACCOUNT> <SPL_TOKEN> 1 10 "Netflix" "Monthly subscription"
get - yarn dev get-mandate <MANDATE>
get - yarn dev get-user-subscriptions
cancel - yarn dev cancel-mandate <MANDATE>

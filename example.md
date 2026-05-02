# Save Scenarios - Postman Request Body

Asagidaki JSON'u Postman'de `POST {{baseUrl}}/scenarios` body'sine yapistir.

```json
{
  "groupId": "cmoocgxlq0005x6v883rw8j5g",
  "input": "Kullanıcı login sayfasında email ve şifre ile giriş yapar.",
  "scenarios": [
    {
      "title": "Geçerli email ve şifre ile başarılı giriş",
      "category": "happy_path",
      "priority": "critical",
      "preconditions": "Kullanıcı sisteme kayıtlı ve aktif hesaba sahip.",
      "steps": [
        "Login sayfasına git",
        "Email alanına geçerli email gir",
        "Şifre alanına doğru şifreyi gir",
        "Giriş Yap butonuna tıkla"
      ],
      "expectedResult": "Kullanıcı dashboard sayfasına yönlendirilir.",
      "bdd": {
        "framework": "cucumber",
        "language": "typescript",
        "code": "Feature: Kullanıcı Girişi\n  Kullanıcıların sisteme giriş yapabilmesi için gerekli senaryolar.\n\n  Background:\n    Given kullanıcı sisteme kayıtlı ve aktif hesaba sahip\n\n  Scenario: Geçerli email ve şifre ile başarılı giriş\n    Given kullanıcı login sayfasındadır\n    When kullanıcı email alanına geçerli email girer\n    And kullanıcı şifre alanına doğru şifreyi girer\n    And kullanıcı Giriş Yap butonuna tıklar\n    Then kullanıcı dashboard sayfasına yönlendirilmelidir\n\n// --- Step Definitions ---\nimport { Given, When, Then, Before, After } from '@cucumber/cucumber';\nimport { expect } from 'chai';\nimport { chromium, Browser, Page, BrowserContext } from 'playwright';\n\nconst BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';\nconst VALID_EMAIL = process.env.TEST_EMAIL ?? 'test@example.com';\nconst VALID_PASSWORD = process.env.TEST_PASSWORD ?? 'Test123!';\n\ndeclare module '@cucumber/cucumber' {\n  interface World {\n    browser: Browser;\n    context: BrowserContext;\n    page: Page;\n  }\n}\n\nBefore(async function () {\n  this.browser = await chromium.launch({ headless: true });\n  this.context = await this.browser.newContext();\n  this.page = await this.context.newPage();\n});\n\nAfter(async function () {\n  await this.context?.close();\n  await this.browser?.close();\n});\n\nGiven('kullanıcı sisteme kayıtlı ve aktif hesaba sahip', async function () {\n  // Ön koşul varsayılır\n});\n\nGiven('kullanıcı login sayfasındadır', async function () {\n  await this.page.goto(`${BASE_URL}/login`);\n  await this.page.waitForSelector('input[type=\"email\"]', { timeout: 5000 });\n});\n\nWhen('kullanıcı email alanına geçerli email girer', async function () {\n  await this.page.fill('input[type=\"email\"]', VALID_EMAIL);\n});\n\nWhen('kullanıcı şifre alanına doğru şifreyi girer', async function () {\n  await this.page.fill('input[type=\"password\"]', VALID_PASSWORD);\n});\n\nWhen('kullanıcı Giriş Yap butonuna tıklar', async function () {\n  await this.page.click('button[type=\"submit\"]');\n  await this.page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 10000 });\n});\n\nThen('kullanıcı dashboard sayfasına yönlendirilmelidir', async function () {\n  const currentUrl = this.page.url();\n  expect(currentUrl).to.include('/dashboard');\n});"
      }
    }
  ]
}
```

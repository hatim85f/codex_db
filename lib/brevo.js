const SibApiV3Sdk = require("sib-api-v3-sdk");

const brevoClient = SibApiV3Sdk.ApiClient.instance;
brevoClient.authentications["api-key"].apiKey =
  process.env.NODE_ENV === "production"
    ? process.env.BREVO_KEY
    : "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";

const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

async function sendTemplateEmail({ to, name, templateId, params }) {
  return tranEmailApi.sendTransacEmail({
    to: [{ email: to, name }],
    templateId,
    params,
    sender: {
      email: "info@codex-fze.com",
      name: "Codex Technology FZE",
    },
  });
}

module.exports = { sendTemplateEmail };

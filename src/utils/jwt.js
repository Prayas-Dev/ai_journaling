// src/utils/jwt.js
export function decodeJwt(token) {
  // Split the token into its parts (header, payload, signature)
  const base64Url = token.split(".")[1];
  if (!base64Url) {
    throw new Error("Invalid token");
  }

  // Convert Base64URL to Base64
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");

  // Decode the Base64 string and parse it as JSON
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );

  return JSON.parse(jsonPayload);
}

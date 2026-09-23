import esbuild from "esbuild";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const lambdaDir = "C:\\Users\\Dell\\OneDrive\\Documents\\superblock-analytics-lamda-functions\\customer_analytics_dashaboard";
const distDir = path.join(lambdaDir, "dist");

async function build() {
  console.log("==> Building Lambda bundle for customer_analytics_dashaboard...");

  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Update package.json in Lambda dir
  const pkgPath = path.join(lambdaDir, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  pkg.main = "index.js";
  pkg.scripts = {
    build: "node bundle.js",
  };
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), "utf8");

  // Bundle root index.js and dist/index.js
  const entryPoint = path.join(lambdaDir, "index.ts");
  const rootOutfile = path.join(lambdaDir, "index.js");
  const distOutfile = path.join(distDir, "index.js");

  for (const outfile of [rootOutfile, distOutfile]) {
    await esbuild.build({
      entryPoints: [entryPoint],
      bundle: true,
      platform: "node",
      target: "node20",
      format: "cjs",
      outfile,
      external: ["pg-native", "@aws-sdk/*"],
      sourcemap: false,
      minify: false,
    });
    console.log(`Generated: ${outfile}`);
  }

  // Create deployment zip in dist/
  const zipPath = path.join(distDir, "customer_analytics_dashaboard.zip");
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  // Use powershell Compress-Archive to create zip
  execSync(
    `powershell -NoProfile -Command "Compress-Archive -Path '${distOutfile}' -DestinationPath '${zipPath}' -Force"`,
    { stdio: "inherit" }
  );

  console.log(`\n Deployment ZIP created successfully at:`);
  console.log(`   ${zipPath}`);
  console.log(`   File size: ${(fs.statSync(zipPath).size / 1024).toFixed(1)} KB`);
}

build().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});

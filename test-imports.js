// Test script for ES modules imports
// Run with: node --import tsx test-imports.js

async function testImports() {
  console.log("Testing imports for Elux routes...");

  try {
    console.log("\nTesting home page import:");
    const homePage = await import("./app/page");
    console.log("✅ Home page imported successfully");
    console.log("Default export exists:", !!homePage.default);
    console.log("Module keys:", Object.keys(homePage));
  } catch (error) {
    console.error("❌ Error importing home page:", error.message);
    console.error(error.stack);
  }

  try {
    console.log("\nTesting about page import:");
    const aboutPage = await import("./app/about/page");
    console.log("✅ About page imported successfully");
    console.log("Default export exists:", !!aboutPage.default);
    console.log("Module keys:", Object.keys(aboutPage));
  } catch (error) {
    console.error("❌ Error importing about page:", error.message);
    console.error(error.stack);
  }

  try {
    console.log("\nTesting notfound page import:");
    const notfoundPage = await import("./app/notfound");
    console.log("✅ NotFound page imported successfully");
    console.log("Default export exists:", !!notfoundPage.default);
    console.log("Module keys:", Object.keys(notfoundPage));
  } catch (error) {
    console.error("❌ Error importing notfound page:", error.message);
    console.error(error.stack);
  }
}

testImports().catch((err) => {
  console.error("Unhandled error in test:", err);
  process.exit(1);
});

import { test, expect } from "@playwright/test";
import { login, USERS } from "./helpers.js";

const AUTOCOMPLETE_URL_FRAGMENT = "/v1/geocode/autocomplete";

const MOCK_ADDRESS = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        place_id: "e2e-place-123-main-st",
        address_line1: "123 Main St",
        city: "Austin",
        state: "Texas",
        postcode: "78701",
        lat: 30.2672,
        lon: -97.7431,
        formatted: "123 Main St, Austin, TX 78701, United States of America",
      },
      geometry: {
        type: "Point",
        coordinates: [-97.7431, 30.2672],
      },
    },
  ],
};

/**
 * Reads the persisted secure-storage payload through the same store module the
 * app uses. This keeps the assertion on the real `"autocompletedata"` contract
 * instead of a duplicated test-only serializer.
 */
async function readAutocompleteStorage(page) {
  return page.evaluate(async () => {
    const module = await import("/src/stores/autocompleteStore.js");
    return module.readStoredAutocompleteData();
  });
}

async function openCreateEvent(page) {
  await page.goto("/dashboard?tab=events");
  await expect(
    page.getByRole("heading", { name: "Your Events" }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Create Event", exact: true })
    .first()
    .click();

  const addressInput = page.getByTestId("address-autocomplete-input");
  await expect(addressInput).toBeVisible();
  return addressInput;
}

test.describe("location autocomplete", () => {
  test("debounces lookups and persists the selected address across reloads", async ({
    page,
  }) => {
    await page.route(`**${AUTOCOMPLETE_URL_FRAGMENT}**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_ADDRESS),
      });
    });

    let autocompleteRequests = 0;
    page.on("request", (request) => {
      if (request.url().includes(AUTOCOMPLETE_URL_FRAGMENT)) {
        autocompleteRequests += 1;
      }
    });

    await login(page, USERS.viewer.email);
    const addressInput = await openCreateEvent(page);

    // Type faster than the 400 ms debounce window. Only the final value should
    // reach the backend.
    await addressInput.pressSequentially("123 Main St", { delay: 15 });

    const suggestion = page.getByRole("option", { name: /123 Main St/ });
    await expect(suggestion).toBeVisible();
    expect(autocompleteRequests).toBe(1);

    await suggestion.click();
    await expect(addressInput).toHaveValue("123 Main St");

    // Selecting a suggestion must not fire another lookup.
    await page.waitForTimeout(700);
    expect(autocompleteRequests).toBe(1);

    const stored = await readAutocompleteStorage(page);
    const selected = stored.find((item) => item.address1 === "123 Main St");

    expect(selected).toBeTruthy();
    expect(Number(selected.latitude)).toBeCloseTo(30.2672, 4);
    expect(Number(selected.longitude)).toBeCloseTo(-97.7431, 4);
    expect(selected.city).toBe("Austin");
    expect(selected.state).toBe("Texas");
    expect(selected.zipcode).toBe("78701");
    expect(selected.locationid).toBe("e2e-place-123-main-st");

    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Your Events" }),
    ).toBeVisible();

    const afterReload = await readAutocompleteStorage(page);
    const persisted = afterReload.find(
      (item) => item.address1 === "123 Main St",
    );

    expect(persisted).toBeTruthy();
    expect(Number(persisted.latitude)).toBeCloseTo(30.2672, 4);
    expect(Number(persisted.longitude)).toBeCloseTo(-97.7431, 4);
  });
});

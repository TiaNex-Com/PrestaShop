// Import utils
import testContext from '@utils/testContext';

// Import common tests
import loginCommon from '@commonTests/BO/loginBO';
import {installHummingbird, uninstallHummingbird} from '@commonTests/BO/design/hummingbird';

// Import BO pages
import productsPage from '@pages/BO/catalog/products';
import productSettingsPage from '@pages/BO/shopParameters/productSettings';

// Import FO pages
import homePage from '@pages/FO/hummingbird/home';

import {expect} from 'chai';
import type {BrowserContext, Page} from 'playwright';
import {
  boDashboardPage,
  foHummingbirdCategoryPage,
  utilsCore,
  utilsPlaywright,
} from '@prestashop-core/ui-testing';

const baseContext: string = 'functional_FO_hummingbird_menuAndNavigation_sortAndFilter_sortProducts';

/*
Pre-condition:
- Install the theme hummingbird
- Disable new product page
- Get the number of active products
- Change the number of products per page
Scenario:
- Sort products list by all options
Post-condition:
- Reset the number of products per page
- Enable new product page
- Uninstall the theme hummingbird
 */
describe('FO - Menu and navigation : Sort products', async () => {
  let browserContext: BrowserContext;
  let page: Page;
  let numberOfActiveProducts: number;

  // Pre-condition : Install Hummingbird
  installHummingbird(`${baseContext}_preTest`);

  // before and after functions
  before(async function () {
    browserContext = await utilsPlaywright.createBrowserContext(this.browser);
    page = await utilsPlaywright.newTab(browserContext);
  });

  after(async () => {
    await utilsPlaywright.closeBrowserContext(browserContext);
  });

  // Pre-condition: Get the number of products
  describe('PRE-TEST : Get the number of active products', async () => {
    it('should login in BO', async function () {
      await loginCommon.loginBO(this, page);
    });

    it('should go to \'Catalog > Products\' page', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'goToProductsPage', baseContext);

      await boDashboardPage.goToSubMenu(
        page,
        boDashboardPage.catalogParentLink,
        boDashboardPage.productsLink,
      );
      await productsPage.closeSfToolBar(page);

      const pageTitle = await productsPage.getPageTitle(page);
      expect(pageTitle).to.contains(productsPage.pageTitle);
    });

    it('should filter by Active Status', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'getNumberOfActiveProducts', baseContext);

      const numberOfProducts = await productsPage.resetAndGetNumberOfLines(page);
      await productsPage.filterProducts(page, 'active', 'Yes', 'select');

      numberOfActiveProducts = await productsPage.getNumberOfProductsFromList(page);
      expect(numberOfActiveProducts).to.within(0, numberOfProducts);
    });
  });

  // Pre-condition : Change the product per page by the number of all products
  describe('PRE-TEST : Change the number of products per page', async () => {
    it('should go to \'Shop parameters > Product Settings\' page', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'goToProductSettingsPage', baseContext);

      await boDashboardPage.goToSubMenu(
        page,
        boDashboardPage.shopParametersParentLink,
        boDashboardPage.productSettingsLink,
      );

      const pageTitle = await productSettingsPage.getPageTitle(page);
      expect(pageTitle).to.contains(productSettingsPage.pageTitle);
    });

    it('should change the value of products per page', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'changeProductPerPage', baseContext);

      const result = await productSettingsPage.setProductsDisplayedPerPage(page, numberOfActiveProducts);
      expect(result).to.contains(productSettingsPage.successfulUpdateMessage);
    });
  });

  // Sort products by name, price
  describe('Sort products list', async () => {
    it('should view my shop', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'goToShopFO', baseContext);

      // Click on view my shop
      page = await productSettingsPage.viewMyShop(page);
      await homePage.changeLanguage(page, 'en');

      const result = await homePage.isHomePage(page);
      expect(result).to.eq(true);
    });

    it('should go to all products page', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'goToAllProducts', baseContext);

      await homePage.changeLanguage(page, 'en');
      await homePage.goToAllProductsPage(page);

      const isCategoryPageVisible = await foHummingbirdCategoryPage.isCategoryPage(page);
      expect(isCategoryPageVisible, 'Home category page was not opened').to.eq(true);
    });

    it('should check that the products as sorted by relevance', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'checkDefaultSort', baseContext);

      const isSortingLinkVisible = await foHummingbirdCategoryPage.getSortByValue(page);
      expect(isSortingLinkVisible).to.contain('Relevance');
    });

    const tests = [
      {
        args: {
          testIdentifier: 'sortByNameAsc',
          sortName: 'Name, A to Z',
          attribute: 'miniature__infos__top',
          sortBy: 'product.name.asc',
          sortDirection: 'asc',
        },
      },
      {
        args: {
          testIdentifier: 'sortByNameDesc',
          sortName: 'Name, Z to A',
          attribute: 'miniature__infos__top',
          sortBy: 'product.name.desc',
          sortDirection: 'desc',
        },
      },
      {
        args: {
          testIdentifier: 'sortByPriceAsc',
          sortName: 'Price, low to high',
          attribute: 'miniature__price',
          sortBy: 'product.price.asc',
          sortDirection: 'asc',
        },
      },
      // @todo https://github.com/PrestaShop/PrestaShop/issues/19810
      /*{
        args: {
          testIdentifier: 'sortByPriceDesc',
          sortName: 'Price, high to low',
          attribute: 'miniature__price',
          sortBy: 'product.price.desc',
          sortDirection: 'desc',
        },
      },*/
    ];
    tests.forEach((test) => {
      it(`should sort by '${test.args.sortName}'`, async function () {
        await testContext.addContextItem(this, 'testIdentifier', test.args.testIdentifier, baseContext);

        const nonSortedTable = await foHummingbirdCategoryPage.getAllProductsAttribute(page, test.args.attribute);
        await foHummingbirdCategoryPage.sortProductsList(page, test.args.sortBy);
        const sortedTable = await foHummingbirdCategoryPage.getAllProductsAttribute(page, test.args.attribute);

        const expectedResult: string[] = await utilsCore.sortArray(nonSortedTable);

        if (test.args.sortDirection === 'asc') {
          expect(sortedTable).to.deep.equal(expectedResult);
        } else {
          expect(sortedTable).to.deep.equal(expectedResult.reverse());
        }
      });
    });
  });

  // Post-condition : Reset product per page by the number of all products
  describe('POST-TEST : Reset the number of products per page', async () => {
    it('should close the FO page', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'closeFo', baseContext);

      page = await foHummingbirdCategoryPage.closePage(browserContext, page, 0);

      const pageTitle = await productSettingsPage.getPageTitle(page);
      expect(pageTitle).to.contains(productSettingsPage.pageTitle);
    });

    it('should change the value of products per page', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'ResetProductPerPage', baseContext);

      const result = await productSettingsPage.setProductsDisplayedPerPage(page, 12);
      expect(result).to.contains(productSettingsPage.successfulUpdateMessage);
    });
  });

  // Post-condition : Uninstall Hummingbird
  uninstallHummingbird(`${baseContext}_postTest`);
});

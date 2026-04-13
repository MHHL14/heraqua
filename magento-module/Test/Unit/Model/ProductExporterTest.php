<?php
declare(strict_types=1);

namespace Herqua\Schoenadviseur\Test\Unit\Model;

use Herqua\Schoenadviseur\Model\Cache\ProductsCache;
use Herqua\Schoenadviseur\Model\Config;
use Herqua\Schoenadviseur\Model\FieldMapping;
use Herqua\Schoenadviseur\Model\ProductExporter;
use Magento\Catalog\Api\Data\ProductInterface;
use Magento\Catalog\Api\ProductRepositoryInterface;
use Magento\Framework\Api\SearchCriteriaBuilder;
use Magento\Framework\Api\SearchResults;
use PHPUnit\Framework\TestCase;

final class ProductExporterTest extends TestCase
{
    public function testExportsProductsAccordingToMapping(): void
    {
        $product = $this->createMock(ProductInterface::class);
        $product->method('getName')->willReturn('Saucony Triumph');
        $product->method('getPrice')->willReturn(199.95);
        $product->method('getSku')->willReturn('SAUC-TRI-001');
        $product->method('getCustomAttribute')->willReturnCallback(function ($code) {
            $values = [
                'manufacturer' => 'Saucony',
                'url_key' => 'saucony-triumph',
                'image' => 'saucony.jpg',
                'herqua_stability' => 'neutraal',
                'herqua_drop_mm' => '8',
            ];
            if (!isset($values[$code])) {
                return null;
            }
            $attr = $this->createMock(\Magento\Framework\Api\AttributeInterface::class);
            $attr->method('getValue')->willReturn($values[$code]);
            return $attr;
        });

        $cache = $this->createMock(ProductsCache::class);
        $cache->expects($this->once())
            ->method('write')
            ->with($this->callback(function ($products) {
                return $products[0]['naam'] === 'Saucony Triumph'
                    && $products[0]['prijs'] === 199.95
                    && $products[0]['merk'] === 'Saucony'
                    && $products[0]['stabiliteit'] === 'neutraal'
                    && $products[0]['drop'] === '8';
            }));

        $exporter = $this->buildExporter([$product], $cache, [
            'naam' => 'name',
            'prijs' => 'price',
            'afbeelding' => 'image',
            'url' => 'url_key',
            'merk' => 'manufacturer',
            'stabiliteit' => 'herqua_stability',
            'drop' => 'herqua_drop_mm',
        ]);

        $count = $exporter->rebuild();
        $this->assertSame(1, $count);
    }

    public function testSkipsUnmappedOptionalFields(): void
    {
        $product = $this->createMock(ProductInterface::class);
        $product->method('getName')->willReturn('X');
        $product->method('getPrice')->willReturn(10.0);
        $product->method('getSku')->willReturn('X');
        $product->method('getCustomAttribute')->willReturn(null);

        $cache = $this->createMock(ProductsCache::class);
        $cache->expects($this->once())
            ->method('write')
            ->with($this->callback(function ($products) {
                return $products[0]['naam'] === 'X'
                    && !array_key_exists('stabiliteit', $products[0]);
            }));

        $mapping = [
            'naam' => 'name',
            'prijs' => 'price',
            'afbeelding' => '',
            'url' => '',
            'merk' => '',
            'stabiliteit' => '',
        ];

        $searchResults = $this->createMock(SearchResults::class);
        $searchResults->method('getItems')->willReturn([$product]);

        $repo = $this->createMock(ProductRepositoryInterface::class);
        $repo->method('getList')->willReturn($searchResults);

        $criteriaBuilder = $this->createMock(SearchCriteriaBuilder::class);
        $criteriaBuilder->method('addFilter')->willReturnSelf();
        $criteriaBuilder->method('create')->willReturn(
            $this->createMock(\Magento\Framework\Api\SearchCriteria::class)
        );

        $config = $this->createMock(Config::class);
        $config->method('getCategoryFilter')->willReturn(null);

        $fieldMapping = $this->createMock(FieldMapping::class);
        $fieldMapping->method('get')->willReturn($mapping);
        // Only naam and prijs are required; afbeelding/url/merk/stabiliteit are optional
        $fieldMapping->method('getRequiredFields')->willReturn(['naam', 'prijs']);

        $exporter = new ProductExporter($repo, $criteriaBuilder, $cache, $fieldMapping, $config);
        $exporter->rebuild();
    }

    public function testThrowsWhenRequiredFieldMissing(): void
    {
        $cache = $this->createMock(ProductsCache::class);
        $exporter = $this->buildExporter([], $cache, [
            'naam' => '',
            'prijs' => 'price',
            'afbeelding' => 'image',
            'url' => 'url_key',
        ]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Verplicht veld "naam" niet gemapt');
        $exporter->rebuild();
    }

    /**
     * @param ProductInterface[] $products
     * @param array<string, string> $mapping
     */
    private function buildExporter(array $products, ProductsCache $cache, array $mapping): ProductExporter
    {
        $searchResults = $this->createMock(SearchResults::class);
        $searchResults->method('getItems')->willReturn($products);

        $repo = $this->createMock(ProductRepositoryInterface::class);
        $repo->method('getList')->willReturn($searchResults);

        $criteriaBuilder = $this->createMock(SearchCriteriaBuilder::class);
        $criteriaBuilder->method('addFilter')->willReturnSelf();
        $criteriaBuilder->method('create')->willReturn(
            $this->createMock(\Magento\Framework\Api\SearchCriteria::class)
        );

        $config = $this->createMock(Config::class);
        $config->method('getCategoryFilter')->willReturn(null);

        $fieldMapping = $this->createMock(FieldMapping::class);
        $fieldMapping->method('get')->willReturn($mapping);
        $fieldMapping->method('getRequiredFields')->willReturn(['naam', 'prijs', 'afbeelding', 'url']);

        return new ProductExporter($repo, $criteriaBuilder, $cache, $fieldMapping, $config);
    }
}

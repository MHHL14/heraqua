<?php
declare(strict_types=1);

namespace Herqua\Schoenadviseur\Model;

use Herqua\Schoenadviseur\Model\Cache\ProductsCache;
use Magento\Catalog\Api\Data\ProductInterface;
use Magento\Catalog\Api\ProductRepositoryInterface;
use Magento\Framework\Api\SearchCriteriaBuilder;

class ProductExporter
{
    /** Native Magento product getters mapped to their attribute-codes */
    private const NATIVE_GETTERS = [
        'name' => 'getName',
        'price' => 'getPrice',
        'sku' => 'getSku',
    ];

    public function __construct(
        private readonly ProductRepositoryInterface $productRepository,
        private readonly SearchCriteriaBuilder $searchCriteriaBuilder,
        private readonly ProductsCache $cache,
        private readonly FieldMapping $fieldMapping,
        private readonly Config $config
    ) {}

    /**
     * @return int Number of products exported
     */
    public function rebuild(): int
    {
        $mapping = $this->fieldMapping->get();
        foreach ($this->fieldMapping->getRequiredFields() as $required) {
            if (($mapping[$required] ?? '') === '') {
                throw new \RuntimeException(sprintf('Verplicht veld "%s" niet gemapt', $required));
            }
        }

        $this->searchCriteriaBuilder->addFilter('status', 1);
        $this->searchCriteriaBuilder->addFilter('visibility', [2, 3, 4], 'in');
        $categoryId = $this->config->getCategoryFilter();
        if ($categoryId !== null) {
            $this->searchCriteriaBuilder->addFilter('category_id', $categoryId);
        }

        $criteria = $this->searchCriteriaBuilder->create();
        $result = $this->productRepository->getList($criteria);

        $items = [];
        foreach ($result->getItems() as $product) {
            $items[] = $this->mapProduct($product, $mapping);
        }

        $this->cache->write($items);
        return count($items);
    }

    /**
     * @param array<string, string> $mapping
     * @return array<string, mixed>
     */
    private function mapProduct(ProductInterface $product, array $mapping): array
    {
        $row = [];
        foreach ($mapping as $widgetField => $magentoAttr) {
            if ($magentoAttr === '') {
                continue;
            }
            $value = $this->readAttribute($product, $magentoAttr);
            if ($value !== null) {
                $row[$widgetField] = $value;
            }
        }
        return $row;
    }

    private function readAttribute(ProductInterface $product, string $code): mixed
    {
        if (isset(self::NATIVE_GETTERS[$code])) {
            $method = self::NATIVE_GETTERS[$code];
            return $product->{$method}();
        }
        $attr = $product->getCustomAttribute($code);
        return $attr?->getValue();
    }
}

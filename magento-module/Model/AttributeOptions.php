<?php
declare(strict_types=1);

namespace Herqua\Schoenadviseur\Model;

use Magento\Catalog\Api\ProductAttributeRepositoryInterface;
use Magento\Framework\Api\SearchCriteriaBuilder;

class AttributeOptions
{
    public function __construct(
        private readonly ProductAttributeRepositoryInterface $attributeRepository,
        private readonly SearchCriteriaBuilder $criteriaBuilder
    ) {}

    /**
     * @return array<string, string> code => label
     */
    public function all(): array
    {
        $criteria = $this->criteriaBuilder->create();
        $result = $this->attributeRepository->getList($criteria);
        $out = [];
        foreach ($result->getItems() as $attribute) {
            $out[$attribute->getAttributeCode()] = (string)($attribute->getDefaultFrontendLabel() ?: $attribute->getAttributeCode());
        }
        ksort($out);
        return $out;
    }
}

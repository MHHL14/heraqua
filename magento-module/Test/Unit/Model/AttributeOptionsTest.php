<?php
declare(strict_types=1);

namespace Herqua\Schoenadviseur\Test\Unit\Model;

use Herqua\Schoenadviseur\Model\AttributeOptions;
use Magento\Catalog\Api\Data\ProductAttributeInterface;
use Magento\Catalog\Api\ProductAttributeRepositoryInterface;
use Magento\Framework\Api\SearchCriteriaBuilder;
use Magento\Framework\Api\SearchResults;
use PHPUnit\Framework\TestCase;

final class AttributeOptionsTest extends TestCase
{
    public function testReturnsAttributeCodesAndLabels(): void
    {
        $a = $this->createMock(ProductAttributeInterface::class);
        $a->method('getAttributeCode')->willReturn('herqua_drop_mm');
        $a->method('getDefaultFrontendLabel')->willReturn('Drop in mm');

        $b = $this->createMock(ProductAttributeInterface::class);
        $b->method('getAttributeCode')->willReturn('manufacturer');
        $b->method('getDefaultFrontendLabel')->willReturn('Merk');

        $searchResults = $this->createMock(SearchResults::class);
        $searchResults->method('getItems')->willReturn([$a, $b]);

        $repo = $this->createMock(ProductAttributeRepositoryInterface::class);
        $repo->method('getList')->willReturn($searchResults);

        $criteriaBuilder = $this->createMock(SearchCriteriaBuilder::class);
        $criteriaBuilder->method('create')
            ->willReturn($this->createMock(\Magento\Framework\Api\SearchCriteria::class));

        $options = (new AttributeOptions($repo, $criteriaBuilder))->all();
        $this->assertSame('Drop in mm', $options['herqua_drop_mm']);
        $this->assertSame('Merk', $options['manufacturer']);
    }
}

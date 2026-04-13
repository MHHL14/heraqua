<?php
declare(strict_types=1);

namespace Herqua\Schoenadviseur\Block\Adminhtml;

use Herqua\Schoenadviseur\Model\AttributeOptions;
use Herqua\Schoenadviseur\Model\Cache\ProductsCache;
use Herqua\Schoenadviseur\Model\FieldMapping;
use Magento\Backend\Block\Template;
use Magento\Backend\Block\Template\Context;

class Mapping extends Template
{
    protected $_template = 'Herqua_Schoenadviseur::mapping.phtml';

    /**
     * @param array<string, mixed> $data
     */
    public function __construct(
        Context $context,
        private readonly FieldMapping $fieldMapping,
        private readonly AttributeOptions $attributeOptions,
        private readonly ProductsCache $cache,
        array $data = []
    ) {
        parent::__construct($context, $data);
    }

    /** @return array<string, string> */
    public function getMapping(): array
    {
        return $this->fieldMapping->get();
    }

    /** @return string[] */
    public function getRequiredFields(): array
    {
        return $this->fieldMapping->getRequiredFields();
    }

    /** @return array<string, string> */
    public function getAttributeOptions(): array
    {
        return $this->attributeOptions->all();
    }

    public function getSaveUrl(): string
    {
        return $this->getUrl('herqua_schoenadviseur/mapping/save');
    }

    public function getRebuildUrl(): string
    {
        return $this->getUrl('herqua_schoenadviseur/rebuild/index');
    }

    public function getLastSync(): ?string
    {
        $ts = $this->cache->lastModified();
        return $ts?->format('Y-m-d H:i:s');
    }
}

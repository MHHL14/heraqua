<?php
declare(strict_types=1);

namespace Herqua\Schoenadviseur\Model;

use Magento\Framework\App\Config\ScopeConfigInterface;
use Magento\Framework\App\Config\Storage\WriterInterface;

class FieldMapping
{
    private const XML_PATH = 'herqua_schoenadviseur/mapping/fields';

    private const DEFAULTS = [
        'naam' => 'name',
        'prijs' => 'price',
        'afbeelding' => 'image',
        'url' => 'url_key',
        'merk' => 'manufacturer',
        'stabiliteit' => '',
        'drop' => '',
        'gewicht' => '',
        'pronatie_geschikt' => '',
        'categorie_hardloopschoen' => '',
    ];

    private const REQUIRED = ['naam', 'prijs', 'afbeelding', 'url'];

    public function __construct(
        private readonly ScopeConfigInterface $scopeConfig,
        private readonly WriterInterface $configWriter
    ) {}

    /**
     * @return array<string, string>
     */
    public function get(): array
    {
        $stored = $this->scopeConfig->getValue(self::XML_PATH);
        if (!is_string($stored) || $stored === '') {
            return self::DEFAULTS;
        }
        $decoded = json_decode($stored, true);
        if (!is_array($decoded)) {
            return self::DEFAULTS;
        }
        return array_merge(self::DEFAULTS, $decoded);
    }

    /**
     * @param array<string, string> $mapping
     */
    public function save(array $mapping): void
    {
        $this->configWriter->save(self::XML_PATH, json_encode($mapping));
    }

    /**
     * @return string[]
     */
    public function getRequiredFields(): array
    {
        return self::REQUIRED;
    }

    /**
     * @return string[] Widget-velden met een Magento-attribute
     */
    public function getMappedFields(): array
    {
        return array_keys(array_filter($this->get(), static fn($v) => $v !== ''));
    }
}

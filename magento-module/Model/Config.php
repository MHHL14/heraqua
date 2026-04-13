<?php
declare(strict_types=1);

namespace Herqua\Schoenadviseur\Model;

use Magento\Framework\App\Config\ScopeConfigInterface;
use Magento\Framework\Encryption\EncryptorInterface;
use Magento\Store\Model\ScopeInterface;

class Config
{
    private const XML_PATH = 'herqua_schoenadviseur/';

    public function __construct(
        private readonly ScopeConfigInterface $scopeConfig,
        private readonly EncryptorInterface $encryptor
    ) {}

    public function isEnabled(): bool
    {
        return $this->scopeConfig->isSetFlag(self::XML_PATH . 'general/enabled', ScopeInterface::SCOPE_STORE);
    }

    public function getDataSource(): string
    {
        return (string)($this->scopeConfig->getValue(self::XML_PATH . 'general/data_source', ScopeInterface::SCOPE_STORE) ?? 'scraping');
    }

    public function getBackendUrl(): string
    {
        return (string)($this->scopeConfig->getValue(self::XML_PATH . 'backend/url', ScopeInterface::SCOPE_STORE) ?? '');
    }

    public function getBackendToken(): string
    {
        $encrypted = (string)($this->scopeConfig->getValue(self::XML_PATH . 'backend/auth_token', ScopeInterface::SCOPE_STORE) ?? '');
        return $encrypted === '' ? '' : $this->encryptor->decrypt($encrypted);
    }

    public function getAssetSource(): string
    {
        return (string)($this->scopeConfig->getValue(self::XML_PATH . 'widget/asset_source', ScopeInterface::SCOPE_STORE) ?? 'bundled');
    }

    public function getCdnUrl(): string
    {
        return (string)($this->scopeConfig->getValue(self::XML_PATH . 'widget/cdn_url', ScopeInterface::SCOPE_STORE) ?? '');
    }

    public function isAutoEmbed(): bool
    {
        return $this->scopeConfig->isSetFlag(self::XML_PATH . 'widget/auto_embed', ScopeInterface::SCOPE_STORE);
    }

    public function getCronFrequency(): string
    {
        return (string)($this->scopeConfig->getValue(self::XML_PATH . 'sync/cron_frequency') ?? 'daily');
    }

    public function getCategoryFilter(): ?int
    {
        $val = $this->scopeConfig->getValue(self::XML_PATH . 'sync/category_filter');
        return $val ? (int)$val : null;
    }
}

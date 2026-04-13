<?php
declare(strict_types=1);

namespace Herqua\Schoenadviseur\Block\Widget;

use Herqua\Schoenadviseur\Model\Config;
use Magento\Framework\View\Asset\Repository;
use Magento\Framework\View\Element\Template;
use Magento\Framework\View\Element\Template\Context;
use Magento\Widget\Block\BlockInterface;

class Adviseur extends Template implements BlockInterface
{
    protected $_template = 'Herqua_Schoenadviseur::widget/adviseur.phtml';

    /**
     * @param array<string, mixed> $data
     */
    public function __construct(
        Context $context,
        private readonly Config $config,
        private readonly Repository $assetRepo,
        array $data = []
    ) {
        parent::__construct($context, $data);
    }

    public function getContainerId(): string
    {
        return (string)($this->getData('container_id') ?: 'herqua-adviseur');
    }

    public function getWidgetJsUrl(): string
    {
        return $this->buildAssetUrl('js/widget.js');
    }

    public function getWidgetCssUrl(): string
    {
        return $this->buildAssetUrl('css/widget.css');
    }

    public function getScanCssUrl(): string
    {
        return $this->buildAssetUrl('css/scan.css');
    }

    public function getConfigJson(): string
    {
        return (string)json_encode([
            'productsUrl' => $this->_urlBuilder->getUrl('adviseur/products/index'),
            'backendUrl' => $this->config->getBackendUrl(),
            'authToken' => $this->config->getBackendToken(),
        ], JSON_UNESCAPED_SLASHES);
    }

    private function buildAssetUrl(string $relPath): string
    {
        if ($this->config->getAssetSource() === 'cdn') {
            $base = rtrim($this->config->getCdnUrl(), '/');
            return $base . '/' . ltrim($relPath, '/');
        }
        return $this->assetRepo->getUrl('Herqua_Schoenadviseur::' . $relPath);
    }
}

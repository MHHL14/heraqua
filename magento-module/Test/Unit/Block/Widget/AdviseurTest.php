<?php
declare(strict_types=1);

namespace Herqua\Schoenadviseur\Test\Unit\Block\Widget;

use Herqua\Schoenadviseur\Block\Widget\Adviseur;
use Herqua\Schoenadviseur\Model\Config;
use Magento\Framework\View\Asset\Repository;
use Magento\Framework\View\Element\Template\Context;
use Magento\Framework\UrlInterface;
use PHPUnit\Framework\TestCase;

final class AdviseurTest extends TestCase
{
    public function testAssetUrlBundled(): void
    {
        $config = $this->createMock(Config::class);
        $config->method('getAssetSource')->willReturn('bundled');
        $config->method('getCdnUrl')->willReturn('');
        $config->method('getBackendUrl')->willReturn('https://api.example.com');
        $config->method('getBackendToken')->willReturn('tok');

        $assetRepo = $this->createMock(Repository::class);
        $assetRepo->expects($this->atLeastOnce())->method('getUrl')
            ->with($this->stringContains('Herqua_Schoenadviseur::'))
            ->willReturn('/static/js/widget.js');

        $urlBuilder = $this->createMock(UrlInterface::class);
        $urlBuilder->method('getUrl')->willReturn('/adviseur/products/index');
        $context = $this->createMock(Context::class);
        $context->method('getUrlBuilder')->willReturn($urlBuilder);

        $block = new Adviseur($context, $config, $assetRepo);
        $this->assertStringContainsString('widget.js', $block->getWidgetJsUrl());
    }

    public function testAssetUrlCdn(): void
    {
        $config = $this->createMock(Config::class);
        $config->method('getAssetSource')->willReturn('cdn');
        $config->method('getCdnUrl')->willReturn('https://cdn.herqua.ai/v2c');
        $config->method('getBackendUrl')->willReturn('https://api.example.com');
        $config->method('getBackendToken')->willReturn('tok');

        $assetRepo = $this->createMock(Repository::class);
        $context = $this->createMock(Context::class);
        $urlBuilder = $this->createMock(UrlInterface::class);
        $urlBuilder->method('getUrl')->with('adviseur/products/index')->willReturn('/adviseur/products/index');
        $context->method('getUrlBuilder')->willReturn($urlBuilder);

        $block = new Adviseur($context, $config, $assetRepo);

        $this->assertSame('https://cdn.herqua.ai/v2c/js/widget.js', $block->getWidgetJsUrl());
        $this->assertSame('https://cdn.herqua.ai/v2c/css/widget.css', $block->getWidgetCssUrl());
    }

    public function testConfigJson(): void
    {
        $config = $this->createMock(Config::class);
        $config->method('getAssetSource')->willReturn('cdn');
        $config->method('getCdnUrl')->willReturn('https://cdn.example.com');
        $config->method('getBackendUrl')->willReturn('https://api.example.com');
        $config->method('getBackendToken')->willReturn('tok');

        $urlBuilder = $this->createMock(UrlInterface::class);
        $urlBuilder->method('getUrl')->willReturn('/adviseur/products/index');
        $context = $this->createMock(Context::class);
        $context->method('getUrlBuilder')->willReturn($urlBuilder);

        $block = new Adviseur($context, $config, $this->createMock(Repository::class));
        $json = json_decode($block->getConfigJson(), true);

        $this->assertSame('/adviseur/products/index', $json['productsUrl']);
        $this->assertSame('https://api.example.com', $json['backendUrl']);
        $this->assertSame('tok', $json['authToken']);
    }
}
